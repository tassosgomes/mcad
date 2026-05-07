using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace Identificacao.API.Infrastructure;

// Logto emite:
//   - roles como array flat na claim "roles" (scope "roles" requerido no ID token)
//   - scopes da API resource como string espaço-separada na claim "scope" do access token
// Esta transformação:
//   1. Expande "roles" → role claims no ClaimsPrincipal
//   2. Expande "scope" → individual scope claims (para uso em RequireClaim("scope", "access"))
public class LogtoClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity)
            return Task.FromResult(principal);

        // 1. Roles do ID token (claim "roles")
        foreach (var roleClaim in principal.FindAll("roles"))
        {
            if (!string.IsNullOrWhiteSpace(roleClaim.Value) && !identity.HasClaim(ClaimTypes.Role, roleClaim.Value))
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, roleClaim.Value));
            }
        }

        // 2. Scopes da API resource (claim "scope" espaço-separada)
        var scopeString = principal.FindFirst("scope")?.Value;
        if (!string.IsNullOrWhiteSpace(scopeString))
        {
            var existingScopes = new HashSet<string>(
                principal.FindAll("scope").Select(c => c.Value),
                StringComparer.Ordinal);

            foreach (var scope in scopeString.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                if (existingScopes.Add(scope))
                {
                    identity.AddClaim(new Claim("scope", scope));
                }
            }
        }

        return Task.FromResult(principal);
    }
}
