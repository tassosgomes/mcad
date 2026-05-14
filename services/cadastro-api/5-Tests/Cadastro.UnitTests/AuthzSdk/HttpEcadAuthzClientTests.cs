using System.Net;
using System.Text;
using Ecad.Authz.Sdk;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cadastro.UnitTests.AuthzSdk;

public class HttpEcadAuthzClientTests
{
    [Fact]
    public async Task CheckAsync_WithAllowedDecision_ShouldReturnAllowed()
    {
        var handler = new StubHttpMessageHandler(
            _ => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "allowed": true,
                      "reason": "USER_HAS_PERMISSION",
                      "authzVersion": 42
                    }
                    """,
                    Encoding.UTF8,
                    "application/json")
            });
        var client = CreateClient(handler);

        var decision = await client.CheckAsync(
            new AuthzCheckRequest("cadastro:default:obra:listar"),
            "token-123",
            CancellationToken.None);

        Assert.True(decision.Allowed);
        Assert.Equal("USER_HAS_PERMISSION", decision.Reason);
        Assert.Equal(42, decision.AuthzVersion);
        Assert.Equal("Bearer", handler.LastRequest?.Headers.Authorization?.Scheme);
        Assert.Equal("token-123", handler.LastRequest?.Headers.Authorization?.Parameter);
    }

    [Fact]
    public async Task CheckAsync_WithRemoteError_ShouldReturnUnavailableDeny()
    {
        var client = CreateClient(
            new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError)));

        var decision = await client.CheckAsync(
            new AuthzCheckRequest("cadastro:default:obra:listar"),
            "token-123",
            CancellationToken.None);

        Assert.False(decision.Allowed);
        Assert.Equal("AUTHZ_SERVICE_UNAVAILABLE", decision.Reason);
    }

    private static HttpEcadAuthzClient CreateClient(HttpMessageHandler handler)
    {
        return new HttpEcadAuthzClient(
            new HttpClient(handler)
            {
                BaseAddress = new Uri("https://authz.example/v1/"),
                Timeout = TimeSpan.FromSeconds(3),
            },
            NullLogger<HttpEcadAuthzClient>.Instance);
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
        {
            _respond = respond;
        }

        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            LastRequest = request;
            return Task.FromResult(_respond(request));
        }
    }
}
