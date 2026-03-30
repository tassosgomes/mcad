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
    public async Task Get_Associacoes_Returns200_With7Items()
    {
        var response = await _client.GetAsync("/api/v1/associacoes");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<List<AssociacaoResponse>>();
        
        content.Should().NotBeNull();
        content!.Should().HaveCount(7);
        content!.Should().Contain(a => a.Sigla == "ABRAMUS");
    }

    [Fact]
    public async Task Get_AssociacaoById_WhenExists_Returns200()
    {
        var listResponse = await _client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var existingId = listResponse!.First().Id;

        var response = await _client.GetAsync($"/api/v1/associacoes/{existingId}");
        
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<AssociacaoResponse>();
        content.Should().NotBeNull();
        content!.Id.Should().Be(existingId);
    }

    [Fact]
    public async Task Get_AssociacaoById_WhenNotExists_Returns404()
    {
        var response = await _client.GetAsync($"/api/v1/associacoes/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Post_Associacoes_Returns405()
    {
        var response = await _client.PostAsync("/api/v1/associacoes", new StringContent(""));
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
    }
}
