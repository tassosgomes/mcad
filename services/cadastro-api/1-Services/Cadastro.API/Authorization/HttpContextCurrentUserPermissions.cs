using Cadastro.Application.Common.Authorization;

namespace Cadastro.API.Authorization;

public sealed class HttpContextCurrentUserPermissions(IHttpContextAccessor accessor) : ICurrentUserPermissions
{
    public bool Has(string permission)
    {
        var user = accessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        return user.HasClaim(claim => claim.Type == "permission" && claim.Value == permission);
    }
}
