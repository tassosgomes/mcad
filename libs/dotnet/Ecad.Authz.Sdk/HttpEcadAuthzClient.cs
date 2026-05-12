using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;

namespace Ecad.Authz.Sdk;

public sealed class HttpEcadAuthzClient : IEcadAuthzClient
{
    private static readonly Uri DecisionsPath = new("authz/decisions", UriKind.Relative);

    private readonly HttpClient _httpClient;
    private readonly ILogger<HttpEcadAuthzClient> _logger;

    public HttpEcadAuthzClient(HttpClient httpClient, ILogger<HttpEcadAuthzClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<AuthzDecision> CheckAsync(
        AuthzCheckRequest request,
        string? bearerToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Permission))
        {
            throw new ArgumentException("Permission is required.", nameof(request));
        }

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, DecisionsPath)
        {
            Content = JsonContent.Create(ToApiRequest(request)),
        };

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        try
        {
            using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "AuthZ decision returned non-success status {StatusCode}",
                    (int)response.StatusCode);
                return AuthzDecision.Unavailable();
            }

            var decision = await response.Content.ReadFromJsonAsync<ApiDecisionResponse>(cancellationToken);
            return decision is null
                ? AuthzDecision.Unavailable()
                : new AuthzDecision(
                    decision.Allowed,
                    decision.Reason,
                    decision.AuthzVersion,
                    decision.Scope is null ? null : new AuthzScope(decision.Scope.Type, decision.Scope.Id));
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("AuthZ decision timed out");
            return AuthzDecision.Unavailable();
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(exception, "AuthZ decision request failed");
            return AuthzDecision.Unavailable();
        }
    }

    private static ApiDecisionRequest ToApiRequest(AuthzCheckRequest request)
    {
        return new ApiDecisionRequest(
            request.Permission,
            request.Resource is null
                ? null
                : new ApiResourceRef(request.Resource.Type, request.Resource.Id));
    }

    private sealed record ApiDecisionRequest(string Permission, ApiResourceRef? Resource);

    private sealed record ApiResourceRef(string Type, string Id);

    private sealed record ApiDecisionResponse(
        bool Allowed,
        string Reason,
        long AuthzVersion,
        ApiScope? Scope);

    private sealed record ApiScope(string Type, string Id);
}
