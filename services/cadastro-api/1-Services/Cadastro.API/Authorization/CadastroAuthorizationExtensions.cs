using Ecad.Authz.AspNetCore;

namespace Cadastro.API.Authorization;

public static class CadastroAuthorizationExtensions
{
    public static TBuilder RequireCadastroPermission<TBuilder>(
        this TBuilder builder,
        string permission)
        where TBuilder : IEndpointConventionBuilder
    {
        return builder.RequirePermission(permission);
    }
}
