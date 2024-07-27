﻿using Chats.BE.Controllers.Common;
using Chats.BE.Controllers.Common.Results;
using Chats.BE.Controllers.Public.AccountLogin.Dtos;
using Chats.BE.Controllers.Public.SMSs.Dtos;
using Chats.BE.DB;
using Chats.BE.Services;
using Chats.BE.Services.Common;
using Chats.BE.Services.Configs;
using Chats.BE.Services.Keycloak;
using Chats.BE.Services.Sessions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Chats.BE.Controllers.Public.AccountLogin;

[Route("api/public")]
public class AccountLoginController(ChatsDB db, ILogger<AccountLoginController> logger, SessionManager sessionManager) : ControllerBase
{
    [HttpPost("account-login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromServices] PasswordHasher passwordHasher,
        [FromServices] GlobalDBConfig kcStore,
        [FromServices] UserManager userManager,
        [FromServices] HostUrlService hostUrl,
        CancellationToken cancellationToken)
    {
        object dto = request.AsLoginDto();
        if (dto is SsoLoginRequest sso)
        {
            if (sso.Provider == null) // WeChat
            {
                return new OldBEActionResult(sso);
            }
            else if (sso.Provider.Equals(KnownLoginProviders.Keycloak, StringComparison.OrdinalIgnoreCase))
            {
                return await KeycloakLogin(kcStore, userManager, sso, hostUrl, cancellationToken);
            }
        }
        else if (dto is PasswordLoginRequest passwordDto)
        {
            return await PasswordLogin(passwordHasher, passwordDto, cancellationToken);
        }

        throw new InvalidOperationException("Invalid login request.");
    }

    private async Task<IActionResult> KeycloakLogin(GlobalDBConfig kcStore, UserManager userManager, SsoLoginRequest sso, HostUrlService hostUrl, CancellationToken cancellationToken)
    {
        KeycloakConfig? kcConfig = await kcStore.GetKeycloakConfig(cancellationToken);
        if (kcConfig == null)
        {
            return NotFound("Keycloak config not found");
        }

        AccessTokenInfo token = await kcConfig.GetUserInfo(sso.Code, hostUrl.GetKeycloakSsoRedirectUrl(), cancellationToken);
        User user = await userManager.EnsureKeycloakUser(token, cancellationToken);
        return Ok(await sessionManager.GenerateSessionForUser(user, cancellationToken));
    }

    private async Task<ActionResult> PasswordLogin(PasswordHasher passwordHasher, PasswordLoginRequest passwordDto, CancellationToken cancellationToken)
    {
        User? dbUser = await db.Users.FirstOrDefaultAsync(x => x.Account == passwordDto.UserName, cancellationToken);

        if (dbUser == null)
        {
            logger.LogWarning("User not found: {UserName}", passwordDto.UserName);
            return BadRequest("用户名或密码错误");
        }
        if (!dbUser.Enabled)
        {
            logger.LogWarning("User disabled: {UserName}", passwordDto.UserName);
            return BadRequest("用户名或密码错误");
        }
        if (!passwordHasher.VerifyPassword(passwordDto.Password, dbUser.Password))
        {
            logger.LogWarning("Invalid password: {UserName}", passwordDto.UserName);
            return BadRequest("用户名或密码错误");
        }

        return Ok(await sessionManager.GenerateSessionForUser(dbUser, cancellationToken));
    }
}
