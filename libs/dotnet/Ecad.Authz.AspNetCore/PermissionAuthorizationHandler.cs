using Ecad.Authz.Sdk;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace Ecad.Authz.AspNetCore;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IEcadAuthzClient _authzClient;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PermissionAuthorizationHandler(
        IEcadAuthzClient authzClient,
        IHttpContextAccessor httpContextAccessor)
    {
        _authzClient = authzClient;
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            return;
        }

        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            return;
        }

        var token = ResolveBearerToken(httpContext.Request);
        var decision = await _authzClient.CheckAsync(
            new AuthzCheckRequest(requirement.Permission),
            token,
            httpContext.RequestAborted);

        if (decision.Allowed)
        {
            context.Succeed(requirement);
        }
    }

    private static string? ResolveBearerToken(HttpRequest request)
    {
        var header = request.Headers.Authorization.ToString();
        const string prefix = "Bearer ";
        return header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? header[prefix.Length..]
            : null;
    }
}
