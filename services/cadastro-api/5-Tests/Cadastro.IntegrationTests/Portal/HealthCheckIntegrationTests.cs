using System.Net;
using AwesomeAssertions;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests.Portal;

public class HealthCheckIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public HealthCheckIntegrationTests(CadastroApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthEndpoint_Retorna200_SemAutenticacao()
    {
        var anonClient = _factory.CreateUnauthenticatedClient();

        var response = await anonClient.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task MetricsEndpoint_Retorna200()
    {
        var client = _factory.CreateAuthenticatedClient();

        var response = await client.GetAsync("/metrics");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty();
    }
}
