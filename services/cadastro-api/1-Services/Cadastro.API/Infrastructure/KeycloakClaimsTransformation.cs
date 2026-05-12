using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace Cadastro.API.Infrastructure;

// Logto emite:
//   - roles como array flat na claim "roles" (scope "roles" requerido no ID token)
//   - scopes da API resource como string espaço-separada na claim "scope" do access token
// Esta transformação:
//   1. Expande "roles" → role claims no ClaimsPrincipal
//   2. Expande "scope" → individual scope claims para compatibilidade de autenticação
public sealed class LogtoClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity sourceIdentity || !sourceIdentity.IsAuthenticated)
        {
            return Task.FromResult(principal);
        }

        // Clonar antes de mutar: TransformAsync pode ser invocado concorrentemente sobre o
        // mesmo ClaimsPrincipal cacheado pelo middleware de autenticação, e mutar o identity
        // compartilhado enquanto outra thread enumera causa "Collection was modified".
        var clone = principal.Clone();
        var identity = (ClaimsIdentity)clone.Identity!;

        // 1. Roles do ID token (claim "roles")
        var existingRoles = identity.FindAll(identity.RoleClaimType)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var roleClaim in identity.FindAll("roles").ToList())
        {
            var role = roleClaim.Value;
            if (!string.IsNullOrWhiteSpace(role) && existingRoles.Add(role))
            {
                identity.AddClaim(new Claim(identity.RoleClaimType, role));
            }
        }

        // 2. Scopes da API resource (claim "scope" espaço-separada)
        var scopeString = identity.FindFirst("scope")?.Value;
        if (!string.IsNullOrWhiteSpace(scopeString))
        {
            var existingScopes = identity.FindAll("scope")
                .Select(c => c.Value)
                .ToHashSet(StringComparer.Ordinal);

            foreach (var scope in scopeString.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                if (existingScopes.Add(scope))
                {
                    identity.AddClaim(new Claim("scope", scope));
                }
            }
        }

        return Task.FromResult(clone);
    }
}
