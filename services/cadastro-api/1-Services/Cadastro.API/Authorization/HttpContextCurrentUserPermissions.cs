using Cadastro.Application.Common.Authorization;
using Ecad.Authz.Sdk;

namespace Cadastro.API.Authorization;

public sealed class HttpContextCurrentUserPermissions(
    IHttpContextAccessor accessor,
    IEcadAuthzClient authzClient) : ICurrentUserPermissions
{
    public async Task<bool> HasAsync(string permission)
    {
        var user = accessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        var bearerToken = ExtractBearer(accessor.HttpContext!);
        var decision = await authzClient.CheckAsync(new AuthzCheckRequest(permission), bearerToken);
        return decision.Allowed;
    }

    private static string? ExtractBearer(HttpContext context)
    {
        var header = context.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(header) ||
            !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return header["Bearer ".Length..].Trim();
    }
}
