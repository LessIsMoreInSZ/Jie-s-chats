﻿using Chats.BE.DB;
using System.Text.Json.Serialization;

namespace Chats.BE.Controllers.Admin.AdminModels.Dtos;

public record UpdateModelRequest
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("modelReferenceId")]
    public required short ModelReferenceId { get; init; }

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; init; }

    [JsonPropertyName("deploymentName")]
    public string? DeploymentName { get; init; }

    [JsonPropertyName("modelKeysId")]
    public required short ModelKeyId { get; init; }

    [JsonPropertyName("fileServiceId")]
    public Guid? FileServiceId { get; init; }

    [JsonPropertyName("inputTokenPrice1M")]
    public required decimal InputTokenPrice1M { get; init; }

    [JsonPropertyName("outputTokenPrice1M")]
    public required decimal OutputTokenPrice1M { get; init; }

    public void ApplyTo(Model cm)
    {
        cm.ModelReferenceId = ModelReferenceId;
        cm.Name = Name;
        cm.IsDeleted = !Enabled;
        cm.ModelKeyId = ModelKeyId;
        cm.FileServiceId = FileServiceId;
        cm.PromptTokenPrice1M = InputTokenPrice1M;
        cm.ResponseTokenPrice1M = OutputTokenPrice1M;
        cm.DeploymentName = DeploymentName;
    }
}
