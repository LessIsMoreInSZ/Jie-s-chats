﻿using System.Text.Json.Serialization;

namespace Chats.BE.Controllers.Chats.Conversations.Dtos;

public record SseResponseLine
{
    [JsonPropertyName("result")]
    public required string Result { get; init; }

    [JsonPropertyName("success")]
    public required bool Success { get; init; }
}
