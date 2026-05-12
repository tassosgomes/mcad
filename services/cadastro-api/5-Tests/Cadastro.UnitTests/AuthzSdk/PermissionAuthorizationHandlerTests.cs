using System.Security.Claims;
using Ecad.Authz.AspNetCore;
using Ecad.Authz.Sdk;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;

namespace Cadastro.UnitTests.AuthzSdk;

public class PermissionAuthorizationHandlerTests
{
    [Fact]
    public async Task HandleAsync_WhenAuthzDisabled_SucceedsWithoutRemoteDecision()
    {
        var requirement = new PermissionRequirement("cadastro:obra:listar");
        var context = CreateContext(requirement, isAuthenticated: false);
        var authzClient = new Mock<IEcadAuthzClient>(MockBehavior.Strict);
        var handler = CreateHandler(authzClient.Object, enabled: false);

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
        authzClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_WhenUserIsNotAuthenticated_DoesNotSucceed()
    {
        var requirement = new PermissionRequirement("cadastro:obra:listar");
        var context = CreateContext(requirement, isAuthenticated: false);
        var authzClient = new Mock<IEcadAuthzClient>(MockBehavior.Strict);
        var handler = CreateHandler(authzClient.Object, enabled: true);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        authzClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_WhenAuthzAllowsPermission_Succeeds()
    {
        const string permission = "cadastro:obra:listar";
        const string bearerToken = "token-123";
        var requirement = new PermissionRequirement(permission);
        var context = CreateContext(requirement, isAuthenticated: true);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.Authorization = $"Bearer {bearerToken}";

        var authzClient = new Mock<IEcadAuthzClient>();
        authzClient
            .Setup(client => client.CheckAsync(
                It.Is<AuthzCheckRequest>(request => request.Permission == permission),
                bearerToken,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthzDecision(true, "ALLOWED", 1));

        var handler = CreateHandler(authzClient.Object, enabled: true, httpContext);

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    private static AuthorizationHandlerContext CreateContext(
        PermissionRequirement requirement,
        bool isAuthenticated)
    {
        var identity = isAuthenticated
            ? new ClaimsIdentity([new Claim("sub", "user-1")], "Bearer")
            : new ClaimsIdentity();
        return new AuthorizationHandlerContext([requirement], new ClaimsPrincipal(identity), null);
    }

    private static PermissionAuthorizationHandler CreateHandler(
        IEcadAuthzClient authzClient,
        bool enabled,
        HttpContext? httpContext = null)
    {
        var accessor = new HttpContextAccessor
        {
            HttpContext = httpContext ?? new DefaultHttpContext(),
        };
        var options = new Mock<IOptionsMonitor<EcadAuthzOptions>>();
        options.SetupGet(monitor => monitor.CurrentValue).Returns(new EcadAuthzOptions
        {
            Enabled = enabled,
        });
        return new PermissionAuthorizationHandler(authzClient, accessor, options.Object);
    }
}
