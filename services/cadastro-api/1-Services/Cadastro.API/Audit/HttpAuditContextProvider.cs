using System.Security.Claims;
using Cadastro.Application.Audit;
using Ecad.Audit.Sdk;

namespace Cadastro.API.Audit;

public sealed class HttpAuditContextProvider : IAuditContextProvider
{
    private const string HeaderScreenAccessId = "X-Audit-Screen-Access-Id";
    private const string HeaderCommandId = "X-Audit-Command-Id";
    private const string HeaderScreenId = "X-Audit-Screen-Id";
    private const string HeaderScreenName = "X-Audit-Screen-Name";
    private const string HeaderRoute = "X-Audit-Route";
    private const string HeaderSessionId = "X-Audit-Session-Id";
    private const string HeaderRequestId = "X-Request-Id";
    private const string HeaderCorrelationId = "X-Correlation-Id";
    private const string HeaderTraceParent = "traceparent";

    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpAuditContextProvider(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public AuditContext Current(string fallbackUsername = "system")
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var user = httpContext?.User;
        var username = ClaimOrDefault(user, "preferred_username", user?.Identity?.Name ?? fallbackUsername);
        var userId = ClaimOrDefault(user, "sub", username);
        var displayName = ClaimOrDefault(user, "name", username);
        var requestId = HeaderOrGenerated(httpContext, HeaderRequestId);

        return new AuditContext(
            UserId: userId,
            Username: username,
            DisplayName: displayName,
            Roles: Roles(user),
            AuthProvider: user?.Identity?.IsAuthenticated == true ? "oidc" : "system",
            Ip: ClientIp(httpContext),
            UserAgent: Header(httpContext, "User-Agent"),
            TraceId: TraceId(httpContext, requestId),
            RequestId: requestId,
            UserSessionId: Header(httpContext, HeaderSessionId),
            ScreenAccessId: Header(httpContext, HeaderScreenAccessId),
            CommandId: Header(httpContext, HeaderCommandId),
            ScreenId: Header(httpContext, HeaderScreenId),
            ScreenName: Header(httpContext, HeaderScreenName),
            Route: Header(httpContext, HeaderRoute) ?? httpContext?.Request.Path.Value,
            Channel: "WEB");
    }

    private static IReadOnlyList<string> Roles(ClaimsPrincipal? user)
    {
        if (user is null)
        {
            return [];
        }

        return user.Claims
            .Where(claim => claim.Type is ClaimTypes.Role or "role" or "roles")
            .Select(claim => claim.Value.StartsWith("ROLE_", StringComparison.Ordinal)
                ? claim.Value[5..]
                : claim.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string ClaimOrDefault(ClaimsPrincipal? user, string claimType, string fallback)
    {
        var value = user?.FindFirst(claimType)?.Value;
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }

    private static string TraceId(HttpContext? httpContext, string fallback)
    {
        var traceparent = Header(httpContext, HeaderTraceParent);
        if (!string.IsNullOrWhiteSpace(traceparent))
        {
            var parts = traceparent.Split('-');
            if (parts.Length >= 2 && !string.IsNullOrWhiteSpace(parts[1]))
            {
                return parts[1];
            }
        }

        return Header(httpContext, HeaderCorrelationId) ?? fallback.Replace("-", string.Empty, StringComparison.Ordinal);
    }

    private static string? ClientIp(HttpContext? httpContext)
    {
        var forwardedFor = Header(httpContext, "X-Forwarded-For");
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        return httpContext?.Connection.RemoteIpAddress?.ToString();
    }

    private static string HeaderOrGenerated(HttpContext? httpContext, string name)
    {
        return Header(httpContext, name) ?? Guid.NewGuid().ToString();
    }

    private static string? Header(HttpContext? httpContext, string name)
    {
        if (httpContext is null || !httpContext.Request.Headers.TryGetValue(name, out var values))
        {
            return null;
        }

        var value = values.FirstOrDefault();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
