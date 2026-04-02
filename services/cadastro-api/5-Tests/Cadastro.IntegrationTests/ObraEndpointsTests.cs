using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Obras.Commands;
using Cadastro.Application.Obras.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Interfaces;
using Cadastro.IntegrationTests.Fixtures;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Cadastro.IntegrationTests;

public class ObraEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly HttpClient _client;
    private readonly Mock<IIswcService> _mockIswcService;

    public ObraEndpointsTests(CadastroApiFactory factory)
    {
        _mockIswcService = new Mock<IIswcService>();

        _client = factory.CreateAuthenticatedClient(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IIswcService));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }
                services.AddScoped<IIswcService>(_ => _mockIswcService.Object);
            });
        });
    }

    private static string GerarCpfValido()
    {
        var rng = new Random();
        var num = new int[9];
        for (int i = 0; i < 9; i++) num[i] = rng.Next(0, 9);
        var sum1 = 0;
        for (int i = 0; i < 9; i++) sum1 += num[i] * (10 - i);
        var r1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11);
        var sum2 = 0;
        for (int i = 0; i < 9; i++) sum2 += num[i] * (11 - i);
        sum2 += r1 * 2;
        var r2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11);
        return $"{string.Join("", num)}{r1}{r2}";
    }

    private async Task SeedTitularidadeParaIswcAsync(Guid obraId, string? cpf = null)
    {
        cpf = cpf ?? GerarCpfValido();
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        var assocId = Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);

        var requestTitular = new Cadastro.Application.Titulares.Commands.CriarTitularCommand($"Titular {cpf}", "PF", cpf, "BR", assocId, null);
        var resTitular = await _client.PostAsJsonAsync("/api/v1/titulares", requestTitular);
        var titular = await resTitular.Content.ReadFromJsonAsync<TitularResponse>();

        var cmdTitularidade = new AdicionarTitularidadeRequest(titular!.Id, "AUTOR", 100.0m);
        await _client.PostAsJsonAsync($"/api/v1/obras/{obraId}/titularidades", cmdTitularidade);
    }

    [Fact]
    public async Task A_Post_CriarObra_Returns201()
    {
        var request = new CriarObraCommand("Obra Teste 1", null, "MUSICAL", "Rock");
        var response = await _client.PostAsJsonAsync("/api/v1/obras", request);
        
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        
        var obra = await response.Content.ReadFromJsonAsync<ObraResponse>();
        obra.Should().NotBeNull();
        obra!.Titulo.Should().Be("Obra Teste 1");
        obra.Status.Should().Be("PENDENTE");
    }

    [Fact]
    public async Task Get_ListarObras_ReturnsPaginadoEFiltrado()
    {
        await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("Meu Hit", null, "MUSICAL", "Pop"));

        var response = await _client.GetAsync("/api/v1/obras?page=1&size=5&titulo=Meu Hit");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<ObraListResponse>();
        content.Should().NotBeNull();
        content!.Pagination.Page.Should().Be(1);
        content.Data.Any(o => o.Titulo == "Meu Hit").Should().BeTrue();
    }

    [Fact]
    public async Task Get_BuscarObraPorId_Returns200()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("Buscar id", null, "MUSICAL", "Rap"));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        var response = await _client.GetAsync($"/api/v1/obras/{created!.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Get_BuscarObraPorId_Inexistente_Returns404()
    {
        var response = await _client.GetAsync($"/api/v1/obras/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Put_AtualizarObra_Pendente_Returns200()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("Para Atualizar", null, "MUSICAL", null));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        var request = new AtualizarObraRequest("Atualizada", "Sub", "MUSICAL", "Rock");
        var response = await _client.PutAsJsonAsync($"/api/v1/obras/{created!.Id}", request);
        
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<ObraResponse>();
        updated!.Titulo.Should().Be("Atualizada");
    }

    [Fact]
    public async Task Post_ObterIswc_MockHttpClient_Returns200()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("Obra Iswc", null, "MUSICAL", null));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        _mockIswcService.Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString().Substring(0, 8)}");

        await SeedTitularidadeParaIswcAsync(created!.Id);

        var response = await _client.PostAsync($"/api/v1/obras/{created!.Id}/iswc", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var obra = await response.Content.ReadFromJsonAsync<ObraResponse>();
        obra!.Iswc.Should().NotBeNullOrEmpty();
        obra.Status.Should().Be("LIBERADO");
    }

    [Fact]
    public async Task Post_ObterIswc_SemTitulares_Returns422()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("Sem Titular", null, "MUSICAL", null));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        var response = await _client.PostAsync($"/api/v1/obras/{created!.Id}/iswc", null);
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Put_AtualizarObra_LiberadaTituloDiferente_Returns409Depuracao()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("Liberada", null, "MUSICAL", null));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        _mockIswcService.Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync($"T-{Guid.NewGuid().ToString().Substring(0, 8)}");

        await SeedTitularidadeParaIswcAsync(created!.Id);

        var iswcRes = await _client.PostAsync($"/api/v1/obras/{created!.Id}/iswc", null); // Set Liberada
        var iswcBody = await iswcRes.Content.ReadAsStringAsync();
        if(!iswcRes.IsSuccessStatusCode) throw new Exception("ISWC Failed: " + iswcBody);
        Console.WriteLine("ISWC BODY: " + iswcBody);

        var request = new AtualizarObraRequest("Liberada Modificada", null, "MUSICAL", null);
        var response = await _client.PutAsJsonAsync($"/api/v1/obras/{created.Id}", request);

        var contentStr = await response.Content.ReadAsStringAsync();
        if (response.StatusCode != HttpStatusCode.Conflict)
            throw new Exception($"Expected 409, got {response.StatusCode}. Body: {contentStr}");
        
        contentStr.Should().Contain("DEPURACAO_NECESSARIA");
    }

    [Fact]
    public async Task Post_DepurarObra_Returns201()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("Para Depurar", null, "MUSICAL", null));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        _mockIswcService.Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString().Substring(0, 8)}");
        await SeedTitularidadeParaIswcAsync(created!.Id);
        var iswcRes = await _client.PostAsync($"/api/v1/obras/{created!.Id}/iswc", null);
        iswcRes.EnsureSuccessStatusCode();

        var request = new DepurarObraRequest("Depurada Nova", "MUSICAL", "Sub", "Pop");
        var response = await _client.PostAsJsonAsync($"/api/v1/obras/{created.Id}/depurar", request);

        var contentStr = await response.Content.ReadAsStringAsync();
        if (response.StatusCode != HttpStatusCode.Created)
            throw new Exception($"Expected 201, got {response.StatusCode}. Body: {contentStr}");
    }

    [Fact]
    public async Task Put_DominioPublico_Returns200()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("Para DP", null, "MUSICAL", null));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        var request = new AlterarDominioPublicoRequest(true);
        var response = await _client.PutAsJsonAsync($"/api/v1/obras/{created!.Id}/dominio-publico", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<ObraResponse>();
        updated!.Status.Should().Be("DOMINIO_PUBLICO");
    }

    [Fact]
    public async Task Delete_ObraDepurada_Returns409()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("A Excluir DEPURADA", null, "MUSICAL", null));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();
        _mockIswcService.Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync($"T-{Guid.NewGuid().ToString().Substring(0, 8)}");
        await SeedTitularidadeParaIswcAsync(created!.Id);
        var iswcRes = await _client.PostAsync($"/api/v1/obras/{created!.Id}/iswc", null);
        iswcRes.EnsureSuccessStatusCode();
        
        var depReqRes = await _client.PostAsJsonAsync($"/api/v1/obras/{created.Id}/depurar", new DepurarObraRequest("Nova", "MUSICAL", null, null));
        depReqRes.EnsureSuccessStatusCode();

        var response = await _client.DeleteAsync($"/api/v1/obras/{created.Id}");
        
        var contentStr = await response.Content.ReadAsStringAsync();
        if (response.StatusCode != HttpStatusCode.Conflict)
            throw new Exception($"Expected 409, got {response.StatusCode}. Body: {contentStr}");
    }

    [Fact]
    public async Task Delete_SemVinculos_Returns204()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand("A Excluir", null, "MUSICAL", null));
        var created = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        var response = await _client.DeleteAsync($"/api/v1/obras/{created!.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
