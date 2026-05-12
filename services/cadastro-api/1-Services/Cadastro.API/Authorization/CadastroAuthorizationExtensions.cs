using Ecad.Authz.AspNetCore;

namespace Cadastro.API.Authorization;

public static class CadastroAuthorizationExtensions
{
    public static TBuilder RequireCadastroPermission<TBuilder>(
        this TBuilder builder,
        string permission,
        bool authEnabled)
        where TBuilder : IEndpointConventionBuilder
    {
        return authEnabled
            ? builder.RequirePermission(permission)
            : builder.AllowAnonymous();
    }
}
