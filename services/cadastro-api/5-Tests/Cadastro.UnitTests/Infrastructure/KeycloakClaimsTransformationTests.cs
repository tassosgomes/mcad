using System.Security.Claims;
using AwesomeAssertions;
using Cadastro.API.Infrastructure;

namespace Cadastro.UnitTests.Infrastructure;

public class KeycloakClaimsTransformationTests
{
    [Fact]
    public async Task TransformAsync_WithRealmAccessRoles_AddsRoleClaims()
    {
        var principal = CreatePrincipal(["consultor", "analista-cadastro"]);
        var sut = new LogtoClaimsTransformation();

        var result = await sut.TransformAsync(principal);

        result.FindAll(ClaimTypes.Role)
            .Select(claim => claim.Value)
            .Should()
            .BeEquivalentTo(["consultor", "analista-cadastro"]);
    }

    [Fact]
    public async Task TransformAsync_WithoutRealmAccess_DoesNotFailOrAddRoles()
    {
        var identity = new ClaimsIdentity(authenticationType: "test");
        var principal = new ClaimsPrincipal(identity);
        var sut = new LogtoClaimsTransformation();

        var result = await sut.TransformAsync(principal);

        result.FindAll(ClaimTypes.Role).Should().BeEmpty();
    }

    [Fact]
    public async Task TransformAsync_WithEmptyRoles_DoesNotAddRoleClaims()
    {
        var principal = CreatePrincipal([]);
        var sut = new LogtoClaimsTransformation();

        var result = await sut.TransformAsync(principal);

        result.FindAll(ClaimTypes.Role).Should().BeEmpty();
    }

    private static ClaimsPrincipal CreatePrincipal(IEnumerable<string> roles)
    {
        var identity = new ClaimsIdentity(
            roles.Select(role => new Claim("roles", role)),
            authenticationType: "test",
            nameType: ClaimTypes.Name,
            roleType: ClaimTypes.Role);

        return new ClaimsPrincipal(identity);
    }
}
