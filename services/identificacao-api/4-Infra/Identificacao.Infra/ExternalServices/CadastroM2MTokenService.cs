using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Identificacao.Infra.ExternalServices;

public class CadastroM2MTokenService
{
    private readonly HttpClient _httpClient;
    private readonly CadastroOptions _options;
    private readonly ILogger<CadastroM2MTokenService> _logger;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private string? _cachedToken;
    private DateTimeOffset _expiraEm = DateTimeOffset.MinValue;

    public CadastroM2MTokenService(
        HttpClient httpClient,
        IOptions<CadastroOptions> options,
        ILogger<CadastroM2MTokenService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public bool Configurado => !string.IsNullOrWhiteSpace(_options.ClientId);

    public async Task<string?> ObterTokenAsync(CancellationToken cancellationToken)
    {
        if (!Configurado)
            return null;

        if (_cachedToken != null && _expiraEm > DateTimeOffset.UtcNow.AddSeconds(60))
            return _cachedToken;

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_cachedToken != null && _expiraEm > DateTimeOffset.UtcNow.AddSeconds(60))
                return _cachedToken;

            _logger.LogInformation("Renovando token M2M para o cadastro-api");

            var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = _options.ClientId,
                ["client_secret"] = _options.ClientSecret,
                ["scope"] = _options.Scope,
                ["resource"] = _options.Resource,
            });

            var tokenEndpoint = $"{_options.LogToIssuer.TrimEnd('/')}/token";
            var response = await _httpClient.PostAsync(tokenEndpoint, form, cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<M2MTokenResponse>(cancellationToken: cancellationToken)
                ?? throw new InvalidOperationException("Resposta de token M2M invalida");

            _cachedToken = result.AccessToken;
            _expiraEm = DateTimeOffset.UtcNow.AddSeconds(result.ExpiresIn);

            return _cachedToken;
        }
        finally
        {
            _lock.Release();
        }
    }
}

internal record M2MTokenResponse(
    [property: System.Text.Json.Serialization.JsonPropertyName("access_token")] string AccessToken,
    [property: System.Text.Json.Serialization.JsonPropertyName("expires_in")] int ExpiresIn);
