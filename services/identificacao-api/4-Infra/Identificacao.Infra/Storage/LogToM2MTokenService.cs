using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Identificacao.Infra.Storage;

/// <summary>
/// Singleton que obtem e cacheia o Bearer JWT M2M do LogTo para autenticar no storage-service.
/// Renova automaticamente 60 s antes da expiracao.
/// </summary>
public class LogToM2MTokenService
{
    private readonly HttpClient _httpClient;
    private readonly StorageOptions _options;
    private readonly ILogger<LogToM2MTokenService> _logger;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private string? _cachedToken;
    private DateTimeOffset _expiraEm = DateTimeOffset.MinValue;

    public LogToM2MTokenService(
        HttpClient httpClient,
        IOptions<StorageOptions> options,
        ILogger<LogToM2MTokenService> logger)
    {
        _httpClient = httpClient;
        _options    = options.Value;
        _logger     = logger;
    }

    public async Task<string> ObterTokenAsync(CancellationToken cancellationToken)
    {
        if (_cachedToken != null && _expiraEm > DateTimeOffset.UtcNow.AddSeconds(60))
            return _cachedToken;

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_cachedToken != null && _expiraEm > DateTimeOffset.UtcNow.AddSeconds(60))
                return _cachedToken;

            _logger.LogInformation("Renovando token M2M para o storage-service");

            var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"]    = "client_credentials",
                ["client_id"]     = _options.ClientId,
                ["client_secret"] = _options.ClientSecret,
                ["scope"]         = "storage:read storage:write storage:delete",
                ["resource"]      = _options.Resource,
            });

            var tokenEndpoint = $"{_options.LogToIssuer.TrimEnd('/')}/token";
            var response = await _httpClient.PostAsync(tokenEndpoint, form, cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<LogToTokenResponse>(cancellationToken: cancellationToken)
                ?? throw new InvalidOperationException("Resposta de token M2M invalida");

            _cachedToken = result.AccessToken;
            _expiraEm    = DateTimeOffset.UtcNow.AddSeconds(result.ExpiresIn);

            return _cachedToken;
        }
        finally
        {
            _lock.Release();
        }
    }
}
