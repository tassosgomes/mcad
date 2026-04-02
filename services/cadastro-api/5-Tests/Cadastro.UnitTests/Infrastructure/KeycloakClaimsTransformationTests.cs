using System.Security.Claims;
using AwesomeAssertions;
using Cadastro.API.Infrastructure;

namespace Cadastro.UnitTests.Infrastructure;

public class KeycloakClaimsTransformationTests
{
    [Fact]
    public async Task TransformAsync_WithRealmAccessRoles_AddsRoleClaims()
    {
        var principal = CreatePrincipal("{\"roles\":[\"consultor\",\"analista-cadastro\"]}");
        var sut = new KeycloakClaimsTransformation();

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
        var sut = new KeycloakClaimsTransformation();

        var result = await sut.TransformAsync(principal);

        result.FindAll(ClaimTypes.Role).Should().BeEmpty();
    }

    [Fact]
    public async Task TransformAsync_WithEmptyRoles_DoesNotAddRoleClaims()
    {
        var principal = CreatePrincipal("{\"roles\":[]}");
        var sut = new KeycloakClaimsTransformation();

        var result = await sut.TransformAsync(principal);

        result.FindAll(ClaimTypes.Role).Should().BeEmpty();
    }

    private static ClaimsPrincipal CreatePrincipal(string realmAccess)
    {
        var identity = new ClaimsIdentity(
        [
            new Claim("realm_access", realmAccess)
        ],
        authenticationType: "test",
        nameType: ClaimTypes.Name,
        roleType: ClaimTypes.Role);

        return new ClaimsPrincipal(identity);
    }
}