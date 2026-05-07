using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
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
        _client = factory.CreateClient();
    }

    private async Task<Guid> SeedObraAsync()
    {
        var request = new CriarObraCommand($"Obra {Guid.NewGuid()}", null, "MUSICAL", "Rock");
        var response = await _client.PostAsJsonAsync("/api/v1/obras", request);
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
    public async Task Get_ListarFonogramas_ReturnsPaginado()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));

        var response = await _client.GetAsync($"/api/v1/fonogramas?page=1&size=10&isrc={isrc}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await response.Content.ReadFromJsonAsync<FonogramaListResponse>();
        list.Should().NotBeNull();
        list!.Data.Any(f => f.Isrc == isrc).Should().BeTrue();
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
    public async Task Get_ListarFonogramas_ComFiltroIsrcParcialInexistente_RetornaVazio()
    {
        var obraId = await SeedObraAsync();
        await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand("BRABC2600001", obraId, "BR", null, null));

        var response = await _client.GetAsync("/api/v1/fonogramas?page=1&size=10&isrc=ZZZZZ");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await response.Content.ReadFromJsonAsync<FonogramaListResponse>();
        list.Should().NotBeNull();
        list!.Pagination.Total.Should().Be(0);
        list.Data.Should().BeEmpty();
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
    public async Task Get_BuscarFonogramaPorId_RetornaUrlAudioEBloqueio()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        var postRes = await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));
        var created = await postRes.Content.ReadFromJsonAsync<FonogramaResponse>();

        var patchRes = await _client.PatchAsJsonAsync(
            $"/api/v1/fonogramas/{created!.Id}/url-audio",
            new { url = "https://cdn.example.com/audio/test01.mp3" });
        patchRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var getRes = await _client.GetAsync($"/api/v1/fonogramas/{created.Id}");
        getRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var fetched = await getRes.Content.ReadFromJsonAsync<FonogramaResponse>();
        fetched!.UrlAudio.Should().Be("https://cdn.example.com/audio/test01.mp3");

        var bloquearRes = await _client.PostAsJsonAsync(
            $"/api/v1/fonogramas/{created.Id}/bloquear",
            new BloquearFonogramaRequest("Conflito de licença em análise"));
        bloquearRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var blockedRes = await _client.GetAsync($"/api/v1/fonogramas/{created.Id}");
        var blocked = await blockedRes.Content.ReadFromJsonAsync<FonogramaResponse>();
        blocked!.BloqueioJustificativa.Should().Be("Conflito de licença em análise");
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

    [Fact]
    public async Task Put_AtualizarFonograma_ComUrlAudio_PersisteCampo()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        var postRes = await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));
        var created = await postRes.Content.ReadFromJsonAsync<FonogramaResponse>();

        var request = new AtualizarFonogramaRequest(created!.Isrc, "BR", null, null, "https://cdn.example.com/audio/put.mp3");
        var response = await _client.PutAsJsonAsync($"/api/v1/fonogramas/{created.Id}", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<FonogramaResponse>();
        updated!.UrlAudio.Should().Be("https://cdn.example.com/audio/put.mp3");

        var getRes = await _client.GetAsync($"/api/v1/fonogramas/{created.Id}");
        var fetched = await getRes.Content.ReadFromJsonAsync<FonogramaResponse>();
        fetched!.UrlAudio.Should().Be("https://cdn.example.com/audio/put.mp3");
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

    [Fact]
    public async Task Get_BuscarFonogramasPorObra_Returns200()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));

        var response = await _client.GetAsync($"/api/v1/obras/{obraId}/fonogramas");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await response.Content.ReadFromJsonAsync<FonogramaResumoResponse[]>();
        list.Should().NotBeNull();
        list!.Length.Should().BeGreaterThan(0);
        list[0].IsrcFormatado.Replace("-", "").Should().Be(isrc);
    }
    
    [Fact]
    public async Task Delete_ObraComFonogramas_Returns409()
    {
        var obraId = await SeedObraAsync();
        var isrc = GerarIsrc();
        await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));

        var response = await _client.DeleteAsync($"/api/v1/obras/{obraId}");
        
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var contentStr = await response.Content.ReadAsStringAsync();
        contentStr.Should().Contain("Obra não pode ser excluída");
    }
}
