using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;

namespace Cadastro.API.Infrastructure;

public sealed class KeycloakClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
        {
            return Task.FromResult(principal);
        }

        var realmAccessClaim = principal.FindFirst("realm_access")?.Value;
        if (string.IsNullOrWhiteSpace(realmAccessClaim))
        {
            return Task.FromResult(principal);
        }

        try
        {
            using var document = JsonDocument.Parse(realmAccessClaim);
            if (!document.RootElement.TryGetProperty("roles", out var rolesElement) || rolesElement.ValueKind != JsonValueKind.Array)
            {
                return Task.FromResult(principal);
            }

            var existingRoles = new HashSet<string>(principal.FindAll(identity.RoleClaimType).Select(claim => claim.Value), StringComparer.OrdinalIgnoreCase);

            foreach (var roleElement in rolesElement.EnumerateArray())
            {
                var role = roleElement.GetString();
                if (string.IsNullOrWhiteSpace(role) || !existingRoles.Add(role))
                {
                    continue;
                }

                identity.AddClaim(new Claim(identity.RoleClaimType, role));
            }
        }
        catch (JsonException)
        {
            return Task.FromResult(principal);
        }

        return Task.FromResult(principal);
    }
}