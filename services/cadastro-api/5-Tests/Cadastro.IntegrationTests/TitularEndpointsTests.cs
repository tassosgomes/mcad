using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;
using Cadastro.Application.Common.CQRS;

namespace Cadastro.IntegrationTests;

public class TitularEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly HttpClient _client;

    public TitularEndpointsTests(CadastroApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task B_Post_CriarTitularDuplicado_Returns409()
    {
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        var assocId = Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);

        var request = new CriarTitularRequest("Titular Duplicado", "PF", "98765432100", "Brasileiro", assocId, null);

        // Primeira vez - sucesso
        await _client.PostAsJsonAsync("/api/v1/titulares", request);
        
        // Segunda vez - falha
        var response2 = await _client.PostAsJsonAsync("/api/v1/titulares", request);
        
        response2.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Post_CriarTitularComCpfInvalido_Returns422()
    {
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        var assocId = Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);

        var request = new CriarTitularRequest("Invalido", "PF", "00000000000", "Brasileiro", assocId, null);

        var response = await _client.PostAsJsonAsync("/api/v1/titulares", request);
        
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task GET_ListarTitulares_ReturnsPaginado()
    {
        var response = await _client.GetAsync("/api/v1/titulares?page=1&size=10");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<TitularListResponse>();
        
        content.Should().NotBeNull();
        content!.Data.Should().NotBeNull();
        content.Pagination.Page.Should().Be(1);
    }

    [Fact]
    public async Task Put_AtualizarTitular_Returns200()
    {
        // 1. Criar um novo para atualizar
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        var assocId = Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);
        var cpf = "11223344517";
        
        var createResponse = await _client.PostAsJsonAsync("/api/v1/titulares", new CriarTitularRequest("Criado", "PF", cpf, "BR", assocId, null));
        var created = await createResponse.Content.ReadFromJsonAsync<TitularResponse>();

        // 2. Atualizar
        var updateRequest = new AtualizarTitularRequest("Nome Atualizado", "US", assocId, "FALECIDO", null);
        var response = await _client.PutAsJsonAsync($"/api/v1/titulares/{created!.Id}", updateRequest);

        // 3. Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<TitularResponse>();
        updated!.Nome.Should().Be("Nome Atualizado");
        updated.Nacionalidade.Should().Be("US");
        updated.Status.Should().Be("FALECIDO");
    }

    [Fact]
    public async Task Delete_ExcluirTitular_Returns204()
    {
        // 1. Criar um novo
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        var assocId = Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);
        var cpf = "99887766593";
        var createResponse = await _client.PostAsJsonAsync("/api/v1/titulares", new CriarTitularRequest("VaiExcluir", "PF", cpf, "BR", assocId, null));
        var created = await createResponse.Content.ReadFromJsonAsync<TitularResponse>();

        // 2. Excluir
        var response = await _client.DeleteAsync($"/api/v1/titulares/{created!.Id}");

        // 3. Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // 4. Buscar e confirmar que foi apagado
        var getResponse = await _client.GetAsync($"/api/v1/titulares/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

