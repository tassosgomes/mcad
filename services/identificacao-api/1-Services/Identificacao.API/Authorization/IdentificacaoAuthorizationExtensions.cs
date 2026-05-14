using Ecad.Authz.AspNetCore;

namespace Identificacao.API.Authorization;

/// <summary>
/// Extensões de autorização específicas do serviço Identificação.
/// Centraliza a aplicação das permissões finas via SDK
/// <see cref="Ecad.Authz.AspNetCore"/> em endpoints Minimal API.
/// </summary>
public static class IdentificacaoAuthorizationExtensions
{
    /// <summary>
    /// Aplica a exigência da permissão fina ao endpoint, ou libera o acesso
    /// (<c>AllowAnonymous</c>) quando <paramref name="authEnabled"/> é <c>false</c>.
    /// Mantém compatibilidade com o flag <c>AUTH_ENABLED=false</c> usado em
    /// desenvolvimento local.
    /// </summary>
    public static TBuilder RequireIdentificacaoPermission<TBuilder>(
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
