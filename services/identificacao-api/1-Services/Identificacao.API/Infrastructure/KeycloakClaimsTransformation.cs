using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using System.Text.Json;

namespace Identificacao.API.Infrastructure;

public class KeycloakClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity)
            return Task.FromResult(principal);

        var realmAccessClaim = principal.FindFirst("realm_access");
        if (realmAccessClaim != null)
        {
            try
            {
                var realmAccessAsDict = JsonSerializer.Deserialize<Dictionary<string, string[]>>(realmAccessClaim.Value);
                if (realmAccessAsDict != null && realmAccessAsDict.TryGetValue("roles", out var roles))
                {
                    foreach (var role in roles)
                    {
                        if (!identity.HasClaim(ClaimTypes.Role, role))
                        {
                            identity.AddClaim(new Claim(ClaimTypes.Role, role));
                        }
                    }
                }
            }
            catch
            {
                // Ignore parse errors
            }
        }

        return Task.FromResult(principal);
    }
}
