using Ecad.Authz.AspNetCore;

namespace Identificacao.API.Authorization;

public static class IdentificacaoAuthorizationExtensions
{
    public static TBuilder RequireIdentificacaoPermission<TBuilder>(
        this TBuilder builder,
        string permission)
        where TBuilder : IEndpointConventionBuilder
    {
        return builder.RequirePermission(permission);
    }
}
