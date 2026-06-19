using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Authorization;
using Cadastro.API.Endpoints;
using Cadastro.Application.Fonogramas.Commands;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Application.Obras.Commands;
using Cadastro.Application.Obras.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests;

public class FonogramaEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly HttpClient _client;

    public FonogramaEndpointsTests(CadastroApiFactory factory)
    {
        _client = factory.CreateAuthenticatedClientWithPermissions(
            "analista.teste",
            "analista-cadastro",
            RequiredPermissions);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "test-token");
    }

    private static readonly string[] RequiredPermissions =
    [
        CadastroPermissions.ObraCriar,
        CadastroPermissions.FonogramaCriar,
        CadastroPermissions.FonogramaListar,
        CadastroPermissions.FonogramaVisualizar,
        CadastroPermissions.FonogramaEditar,
        CadastroPermissions.FonogramaExcluir
    ];

    private async Task<Guid> SeedObraAsync()
    {
        var request = new CriarObraCommand($"Obra {Guid.NewGuid()}", null, "MUSICAL", "Rock");
        var response = await _client.PostAsJsonAsync("/api/v1/obras", request);
        var contentStr = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.Created, contentStr);

        var obra = await response.Content.ReadFromJsonAsync<ObraResponse>();
        return obra!.Id;
    }

    private string GerarIsrc()
    {
        var rng = new Random();
        var num = rng.Next(10000, 99999);
        return $"BRXYZ23{num}";
    }

    [Fact]
    public async Task Post_CriarFonograma_Returns201()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();

        var request = new CriarFonogramaCommand(isrc, obraId, "BR", new DateOnly(2023, 1, 1), null);
        var response = await _client.PostAsJsonAsync("/api/v1/fonogramas", request);

        var contentStr = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var fonograma = await response.Content.ReadFromJsonAsync<FonogramaResponse>();
        fonograma.Should().NotBeNull();
        fonograma!.Isrc.Should().Be(isrc);
        fonograma.Obra.Should().NotBeNull();
        fonograma.Status.Should().Be("PENDENTE_VALIDACAO");
    }

    [Fact]
    public async Task Post_CriarFonogramaPendente_ComPayloadValido_DeveRetornar201EPendenteValidacao()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();

        var response = await _client.PostAsJsonAsync("/api/v1/fonogramas/pendentes", new
        {
            obraId,
            isrc
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var fonograma = await response.Content.ReadFromJsonAsync<FonogramaResponse>();
        fonograma.Should().NotBeNull();
        fonograma!.Isrc.Should().Be(isrc);
        fonograma.Obra.Id.Should().Be(obraId);
        fonograma.PaisOrigem.Should().Be("BR");
        fonograma.Status.Should().Be("PENDENTE_VALIDACAO");
        response.Headers.Location!.ToString().Should().Be($"/api/v1/fonogramas/{fonograma.Id}");
    }

    [Fact]
    public async Task Post_CriarFonogramaPendente_SemIsrc_DeveRetornar400()
    {
        var obraId = await SeedObraAsync();

        var response = await _client.PostAsJsonAsync("/api/v1/fonogramas/pendentes", new
        {
            obraId
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var contentStr = await response.Content.ReadAsStringAsync();
        contentStr.Should().Contain("ISRC é obrigatório");
    }

    [Fact]
    public async Task Post_CriarFonogramaPendente_ComIsrcInvalido_DeveRetornar400()
    {
        var obraId = await SeedObraAsync();

        var response = await _client.PostAsJsonAsync("/api/v1/fonogramas/pendentes", new
        {
            obraId,
            isrc = "123456789012"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var contentStr = await response.Content.ReadAsStringAsync();
        contentStr.Should().Contain("ISRC deve seguir formato");
    }

    [Fact]
    public async Task Post_CriarFonogramaPendente_ComIsrcDuplicado_DeveRetornar409()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));

        var response = await _client.PostAsJsonAsync("/api/v1/fonogramas/pendentes", new
        {
            obraId,
            isrc
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var contentStr = await response.Content.ReadAsStringAsync();
        contentStr.Should().Contain("Já existe um fonograma com o ISRC");
    }

    [Fact]
    public async Task Post_CriarFonogramaPendente_ComObraInexistente_DeveRetornar404()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/fonogramas/pendentes", new
        {
            obraId = Guid.NewGuid(),
            isrc = GerarIsrc()
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Post_CriarFonograma_IsrcDuplicado_Returns409()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();

        var request = new CriarFonogramaCommand(isrc, obraId, "BR", null, null);
        await _client.PostAsJsonAsync("/api/v1/fonogramas", request);

        var response = await _client.PostAsJsonAsync("/api/v1/fonogramas", request);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var contentStr = await response.Content.ReadAsStringAsync();
        contentStr.Should().Contain("Já existe um fonograma com o ISRC");
    }

    [Fact]
    public async Task Get_ListarFonogramas_ComFiltroIsrcParcial_RetornaSomenteCorrespondentes()
    {
        var obraId = await SeedObraAsync();
        await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand("BRABC2600001", obraId, "BR", null, null));
        await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand("BRABC2600002", obraId, "BR", null, null));
        await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand("USXYZ2600001", obraId, "US", null, null));

        var response = await _client.GetAsync("/api/v1/fonogramas?page=1&size=10&isrc=BRABC26");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await response.Content.ReadFromJsonAsync<FonogramaListResponse>();
        list.Should().NotBeNull();
        list!.Pagination.Total.Should().Be(2);
        list.Data.Should().OnlyContain(f => f.Isrc.Contains("BRABC26"));
    }

    [Fact]
    public async Task Get_BuscarFonogramaPorId_Returns200()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        var postRes = await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));
        var created = await postRes.Content.ReadFromJsonAsync<FonogramaResponse>();

        var response = await _client.GetAsync($"/api/v1/fonogramas/{created!.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var fetched = await response.Content.ReadFromJsonAsync<FonogramaResponse>();
        fetched!.Id.Should().Be(created.Id);
        fetched.Obra.Should().NotBeNull();
    }

    [Fact]
    public async Task Put_AtualizarFonograma_Pendente_Returns200()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        var postRes = await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));
        var created = await postRes.Content.ReadFromJsonAsync<FonogramaResponse>();

        var novoIsrc = GerarIsrc();
        var request = new AtualizarFonogramaCommand(created!.Id, novoIsrc, "US", null, null);
        var response = await _client.PutAsJsonAsync($"/api/v1/fonogramas/{created.Id}", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<FonogramaResponse>();
        updated!.Isrc.Should().Be(novoIsrc);
        updated.PaisOrigem.Should().Be("US");
    }

    // Nota: Como não temos um endpoint direto para forçar um fonograma ao status LIBERADO (geralmente isso vêm de uma rotina externa na vida real),
    // seria necessário um back-door no repositório nas IntegrationTests se fosse testar essa borda.
    // Vamos pular os testes que dependem de fonograma estar "LIBERADO" (409 em PUT e DELETE) ou criar um endpoint de mock se necessário.
    // O mockIswc do tests de obra pode ser útil se nós tivemos regra de liberado? Não, o status de fonograma não depende de iswc-mock, depende da aprovação?
    // De acordo com o status business, o status do fonograma muda de acordo com o Cpf ou validação externa.
    // Vamos fazer o teste de exclusão de Pendente:

    [Fact]
    public async Task Delete_FonogramaPendente_Returns204()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        var postRes = await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));
        var created = await postRes.Content.ReadFromJsonAsync<FonogramaResponse>();

        var response = await _client.DeleteAsync($"/api/v1/fonogramas/{created!.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

}
