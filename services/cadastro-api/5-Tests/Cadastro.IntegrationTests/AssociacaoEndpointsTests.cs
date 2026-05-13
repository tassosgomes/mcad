using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.Application.Associacoes.Queries;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests;

public class AssociacaoEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly HttpClient _client;

    public AssociacaoEndpointsTests(CadastroApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_AssociacaoById_WhenNotExists_Returns404()
    {
        var response = await _client.GetAsync($"/api/v1/associacoes/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }


}
