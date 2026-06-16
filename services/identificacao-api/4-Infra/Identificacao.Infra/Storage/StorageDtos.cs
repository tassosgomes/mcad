using System.Text.Json.Serialization;

namespace Identificacao.Infra.Storage;

public record StorageFileDto(
    [property: JsonPropertyName("id")]           string Id,
    [property: JsonPropertyName("tenantId")]     string TenantId,
    [property: JsonPropertyName("originalName")] string OriginalName,
    [property: JsonPropertyName("sizeBytes")]    long SizeBytes,
    [property: JsonPropertyName("contentType")]  string ContentType,
    [property: JsonPropertyName("status")]       string Status,
    [property: JsonPropertyName("createdAt")]    DateTimeOffset CreatedAt
);

public record StorageDownloadUrlDto(
    [property: JsonPropertyName("downloadUrl")] string DownloadUrl,
    [property: JsonPropertyName("expiresAt")]   DateTimeOffset ExpiresAt
);

internal record LogToTokenResponse(
    [property: JsonPropertyName("access_token")] string AccessToken,
    [property: JsonPropertyName("expires_in")]   int ExpiresIn
);
