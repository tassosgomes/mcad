using System.Net;
using System.Net.Http.Json;
using Cadastro.API.Endpoints;
using Cadastro.Application.Obras.Commands;
using Cadastro.Application.Obras.Responses;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Interfaces;
using Cadastro.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Cadastro.IntegrationTests;

public class TitularidadeEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;
    private readonly HttpClient _client;
    private readonly Mock<IIswcService> _mockIswcService;

    public TitularidadeEndpointsTests(CadastroApiFactory factory)
    {
        _factory = factory;
        _mockIswcService = new Mock<IIswcService>();
        _mockIswcService
            .Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString()[..8]}");

        _client = factory.CreateAuthenticatedClient(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var d = services.SingleOrDefault(s => s.ServiceType == typeof(IIswcService));
                if (d != null) services.Remove(d);
                services.AddScoped<IIswcService>(_ => _mockIswcService.Object);
            });
        });
    }

    private async Task<Guid> SeedObraAsync(string titulo = "Obra Teste")
    {
        var cmd = new CriarObraCommand(titulo, null, "MUSICAL", "ROCK");
        var res = await _client.PostAsJsonAsync("/api/v1/obras", cmd);
        var created = await res.Content.ReadFromJsonAsync<ObraResponse>();
        return created!.Id;
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

    private async Task<Guid> SeedTitularPFAsync(string nome = "Titular PF", string? cpf = null)
    {
        cpf = cpf ?? GerarCpfValido();
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        var assocId = Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);

        var cmd = new CriarTitularCommand(nome, "PF", cpf, "BR", assocId, null);
        var res = await _client.PostAsJsonAsync("/api/v1/titulares", cmd);
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new Exception($"SeedTitularPFAsync falhou (CPF={cpf}): {body}");
        var created = System.Text.Json.JsonSerializer.Deserialize<TitularResponse>(body,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        return created!.Id;
    }

    private async Task<Guid> SeedTitularPJAsync(string nome = "Editora PJ", string cnpj = "11222333000181")
    {
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        var assocId = Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);

        var cmd = new CriarTitularCommand(nome, "PJ", cnpj, "BR", assocId, null);
        var res = await _client.PostAsJsonAsync("/api/v1/titulares", cmd);
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode) throw new Exception("SeedTitularPJAsync falhou: " + body);
        var created = System.Text.Json.JsonSerializer.Deserialize<TitularResponse>(body, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        return created!.Id;
    }

    [Fact]
    public async Task Adicionar_Retorna201_HappyPath()
    {
        var obraId = await SeedObraAsync("Happy Path Obra");
        var titularId = await SeedTitularPFAsync("Autor Happy");

        var cmd = new AdicionarTitularidadeRequest(titularId, "AUTOR", 50.0m);
        var res = await _client.PostAsJsonAsync($"/api/v1/obras/{obraId}/titularidades", cmd);

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = await res.Content.ReadFromJsonAsync<TitularidadesResponse>();
        result!.SomaPercentual.Should().Be(50.0m);
        result.SomaCompleta.Should().BeFalse();
        result.Titularidades.Should().HaveCount(1);
        result.Titularidades.First().Titular.Id.Should().Be(titularId);
        result.Titularidades.First().Categoria.Should().Be("AUTOR");
        result.Titularidades.First().Percentual.Should().Be(50.0m);
    }

    [Fact]
    public async Task Adicionar_EditorComTitularPF_Retorna422()
    {
        var obraId = await SeedObraAsync("Erro Editor PF");
        var titularId = await SeedTitularPFAsync("PF Tentando Ser Editor");

        var cmd = new AdicionarTitularidadeRequest(titularId, "EDITOR", 100.0m);
        var res = await _client.PostAsJsonAsync($"/api/v1/obras/{obraId}/titularidades", cmd);

        res.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity); // DomainException
    }

    [Fact]
    public async Task Adicionar_Duplicata_Retorna409()
    {
        var obraId = await SeedObraAsync("Duplicata Obra");
        var titularId = await SeedTitularPFAsync("Titular Duplicado");

        var cmd = new AdicionarTitularidadeRequest(titularId, "AUTOR", 50.0m);
        await _client.PostAsJsonAsync($"/api/v1/obras/{obraId}/titularidades", cmd);
        var res = await _client.PostAsJsonAsync($"/api/v1/obras/{obraId}/titularidades", cmd);

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Editar_AtualizaPercentual_Retorna200()
    {
        var obraId = await SeedObraAsync("Editar Obra");
        var titularId = await SeedTitularPFAsync("Autor Edit");

        var addRes = await _client.PostAsJsonAsync($"/api/v1/obras/{obraId}/titularidades", new AdicionarTitularidadeRequest(titularId, "AUTOR", 50.0m));
        var addResult = await addRes.Content.ReadFromJsonAsync<TitularidadesResponse>();
        var titularidadeId = addResult!.Titularidades.First().Id;

        var cmd = new EditarTitularidadeRequest(100.0m);
        var editRes = await _client.PutAsJsonAsync($"/api/v1/obras/{obraId}/titularidades/{titularidadeId}", cmd);

        editRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await editRes.Content.ReadFromJsonAsync<TitularidadesResponse>();
        result!.SomaPercentual.Should().Be(100.0m);
        result.SomaCompleta.Should().BeTrue();
        result.Titularidades.First().Percentual.Should().Be(100.0m);
    }

    [Fact]
    public async Task Adicionar_PercentualInvalido_Retorna422()
    {
        var obraId = await SeedObraAsync("Percentual Invalido Add");
        var titularId = await SeedTitularPFAsync("Autor Percentual Invalido");

        var res = await _client.PostAsJsonAsync(
            $"/api/v1/obras/{obraId}/titularidades",
            new AdicionarTitularidadeRequest(titularId, "AUTOR", 0.0m));

        res.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Buscar_AutocompleteTitulares()
    {
        var titularId = await SeedTitularPFAsync("Caetano Veloso");
        
        var getRes = await _client.GetAsync($"/api/v1/titulares/busca?q=caetan");
        getRes.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await getRes.Content.ReadFromJsonAsync<List<TitularResumoResponse>>();
        result.Should().Contain(t => t.Id == titularId && t.Nome == "Caetano Veloso");
    }

    [Fact]
    public async Task Buscar_AutocompleteTitularesPorDocumentoFormatado()
    {
        var titularId = await SeedTitularPJAsync("Editora Documento Formatado", "11222333000181");

        var getRes = await _client.GetAsync("/api/v1/titulares/busca?q=222.333/0001");
        getRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await getRes.Content.ReadFromJsonAsync<List<TitularResumoResponse>>();
        result.Should().Contain(t => t.Id == titularId && t.Nome == "Editora Documento Formatado");
    }

    [Fact]
    public async Task ObterIswc_AposAdicionarTitulares_DeveFuncionar()
    {
        var obraId = await SeedObraAsync("Obra Para ISWC");
        var titularId = await SeedTitularPFAsync("Autor ISWC");

        await _client.PostAsJsonAsync($"/api/v1/obras/{obraId}/titularidades", new AdicionarTitularidadeRequest(titularId, "AUTOR", 100.0m));

        // Now obtain ISWC
        var iswcRes = await _client.PostAsJsonAsync($"/api/v1/obras/{obraId}/iswc", new { });
        iswcRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await iswcRes.Content.ReadFromJsonAsync<ObraResponse>();
        result!.Status.Should().Be("LIBERADO");
        result.Iswc.Should().NotBeNull();
    }
}
