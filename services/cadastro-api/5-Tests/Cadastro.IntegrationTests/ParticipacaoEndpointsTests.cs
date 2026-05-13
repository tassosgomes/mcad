using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AwesomeAssertions;
using Cadastro.Application.Fonogramas.Commands;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Application.Obras.Commands;
using Cadastro.Application.Obras.Responses;
using Cadastro.Application.Participacoes.Responses;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Application.Titulares.Responses;
using Cadastro.API.Endpoints;
using Cadastro.Domain.Interfaces;
using Cadastro.IntegrationTests.Fixtures;
using Moq;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Cadastro.IntegrationTests;

public class ParticipacaoEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOpts = new() { PropertyNameCaseInsensitive = true };

    public ParticipacaoEndpointsTests(CadastroApiFactory factory)
    {
        var mockIswc = new Mock<IIswcService>();
        mockIswc
            .Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString()[..8]}");

        _client = factory.CreateAuthenticatedClient(b => b.ConfigureTestServices(services =>
        {
            var d = services.SingleOrDefault(s => s.ServiceType == typeof(IIswcService));
            if (d != null) services.Remove(d);
            services.AddScoped<IIswcService>(_ => mockIswc.Object);
        }));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task<Guid> SeedObraAsync()
    {
        var res = await _client.PostAsJsonAsync("/api/v1/obras", new CriarObraCommand($"Obra {Guid.NewGuid()}", null, "MUSICAL", "Rock"));
        var obra = await res.Content.ReadFromJsonAsync<ObraResponse>();
        return obra!.Id;
    }

    private async Task<Guid> SeedFonogramaAsync(Guid obraId)
    {
        var rng = new Random();
        var isrc = $"BRXYZ24{rng.Next(10000, 99999)}";
        var res = await _client.PostAsJsonAsync("/api/v1/fonogramas", new CriarFonogramaCommand(isrc, obraId, "BR", null, null));
        var fono = await res.Content.ReadFromJsonAsync<FonogramaResponse>();
        return fono!.Id;
    }

    private static string GerarCpfValido()
    {
        var rng = new Random();
        var num = new int[9];
        for (int i = 0; i < 9; i++) num[i] = rng.Next(0, 9);
        var s1 = 0; for (int i = 0; i < 9; i++) s1 += num[i] * (10 - i);
        var r1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11);
        var s2 = 0; for (int i = 0; i < 9; i++) s2 += num[i] * (11 - i);
        s2 += r1 * 2;
        var r2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11);
        return $"{string.Join("", num)}{r1}{r2}";
    }

    private async Task<Guid> SeedTitularAsync(string nome, string tipo = "PF")
    {
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        var assocId = Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);

        string doc = tipo == "PJ" ? GerarCnpjValido() : GerarCpfValido();
        var cmd = new CriarTitularCommand(nome, tipo, doc, "BR", assocId, null);
        var res = await _client.PostAsJsonAsync("/api/v1/titulares", cmd);
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode) throw new Exception($"SeedTitular falhou ({tipo}, {nome}): {body}");
        var created = JsonSerializer.Deserialize<TitularResponse>(body, _jsonOpts);
        return created!.Id;
    }

    private static string GerarCnpjValido()
    {
        var rng = new Random();
        // Gera 12 dígitos base (8 cnpj + 4 filial 0001)
        var n = new int[12];
        for (int i = 0; i < 8; i++) n[i] = rng.Next(0, 9);
        n[8] = 0; n[9] = 0; n[10] = 0; n[11] = 1;

        int[] w1 = { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        var s1 = 0; for (int i = 0; i < 12; i++) s1 += n[i] * w1[i];
        var r1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11);

        int[] w2 = { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        var s2 = 0; for (int i = 0; i < 12; i++) s2 += n[i] * w2[i];
        s2 += r1 * w2[12];
        var r2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11);

        return $"{string.Join("", n)}{r1}{r2}";
    }

    private string BaseUrl(Guid fonogramaId) => $"/api/v1/fonogramas/{fonogramaId}/participacoes";

    // ─── Testes ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Post_AdicionarParticipante_Duplicata_Retorna409()
    {
        var obraId = await SeedObraAsync();
        var fonoId = await SeedFonogramaAsync(obraId);
        var interprete = await SeedTitularAsync("Duplicado Int");

        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete, "INTERPRETE"));
        var res = await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete, "INTERPRETE"));

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Post_Calcular_ComposicaoCompleta_Retorna200_Soma100()
    {
        var obraId = await SeedObraAsync();
        var fonoId = await SeedFonogramaAsync(obraId);
        var interprete = await SeedTitularAsync("Caetano");
        var produtor = await SeedTitularAsync("Editora BR", "PJ");

        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete, "INTERPRETE"));
        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(produtor, "PRODUTOR_FONOGRAFICO"));

        var res = await _client.PostAsJsonAsync($"{BaseUrl(fonoId)}/calcular", new { });

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await res.Content.ReadFromJsonAsync<ParticipacoesResponse>();
        result!.SomaCalculada.Should().BeTrue();
        result.SomaPercentual.Should().Be(100.0000m);
        result.PercentuaisDesatualizados.Should().BeFalse();
    }

    [Fact]
    public async Task Post_Calcular_ComMusico_Distribui_43_7_41_7_14_6()
    {
        var obraId = await SeedObraAsync();
        var fonoId = await SeedFonogramaAsync(obraId);
        var interprete = await SeedTitularAsync("Int Musico");
        var produtor = await SeedTitularAsync("Prod Musico", "PJ");
        var musico = await SeedTitularAsync("Musico Exe");

        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete, "INTERPRETE"));
        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(produtor, "PRODUTOR_FONOGRAFICO"));
        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(musico, "MUSICO_EXECUTANTE"));

        var res = await _client.PostAsJsonAsync($"{BaseUrl(fonoId)}/calcular", new { });

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await res.Content.ReadFromJsonAsync<ParticipacoesResponse>();
        result!.SomaPercentual.Should().Be(100.0000m);

        result.Participacoes.Single(p => p.Categoria == "INTERPRETE").Percentual.Should().Be(43.7m);
        result.Participacoes.Single(p => p.Categoria == "PRODUTOR_FONOGRAFICO").Percentual.Should().Be(41.7m);
        result.Participacoes.Single(p => p.Categoria == "MUSICO_EXECUTANTE").Percentual.Should().Be(14.6m);
        result.Participacoes.Single(p => p.Categoria == "MUSICO_EXECUTANTE").Editavel.Should().BeFalse();
    }

    [Fact]
    public async Task Put_AjustarPercentual_Interprete_Retorna200()
    {
        var obraId = await SeedObraAsync();
        var fonoId = await SeedFonogramaAsync(obraId);
        var interprete = await SeedTitularAsync("Int Ajustar");
        var interprete2 = await SeedTitularAsync("Int Ajustar 2");
        var produtor = await SeedTitularAsync("Prod Ajustar", "PJ");

        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete, "INTERPRETE"));
        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete2, "INTERPRETE"));
        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(produtor, "PRODUTOR_FONOGRAFICO"));

        var calcRes = await _client.PostAsJsonAsync($"{BaseUrl(fonoId)}/calcular", new { });
        var calcResult = await calcRes.Content.ReadFromJsonAsync<ParticipacoesResponse>();
        var pid = calcResult!.Participacoes.First(p => p.Categoria == "INTERPRETE").Id;

        var res = await _client.PutAsJsonAsync($"{BaseUrl(fonoId)}/{pid}", new AjustarPercentualRequest(30.0m));

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await res.Content.ReadFromJsonAsync<ParticipacoesResponse>();
        result!.Participacoes.First(p => p.Id == pid).Percentual.Should().Be(30.0m);
    }

    [Fact]
    public async Task Put_AjustarPercentual_Musico_Retorna422()
    {
        var obraId = await SeedObraAsync();
        var fonoId = await SeedFonogramaAsync(obraId);
        var interprete = await SeedTitularAsync("Int PutMusico");
        var produtor = await SeedTitularAsync("Prod PutMusico", "PJ");
        var musico = await SeedTitularAsync("Musico PutMusico");

        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete, "INTERPRETE"));
        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(produtor, "PRODUTOR_FONOGRAFICO"));
        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(musico, "MUSICO_EXECUTANTE"));

        var calcRes = await _client.PostAsJsonAsync($"{BaseUrl(fonoId)}/calcular", new { });
        var calcResult = await calcRes.Content.ReadFromJsonAsync<ParticipacoesResponse>();
        var musicoPid = calcResult!.Participacoes.Single(p => p.Categoria == "MUSICO_EXECUTANTE").Id;

        var res = await _client.PutAsJsonAsync($"{BaseUrl(fonoId)}/{musicoPid}", new AjustarPercentualRequest(10.0m));

        res.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Delete_RemoverParticipante_Retorna200_Desatualizado()
    {
        var obraId = await SeedObraAsync();
        var fonoId = await SeedFonogramaAsync(obraId);
        var interprete = await SeedTitularAsync("Int Remover");
        var produtor = await SeedTitularAsync("Prod Remover", "PJ");

        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete, "INTERPRETE"));
        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(produtor, "PRODUTOR_FONOGRAFICO"));

        var calcRes = await _client.PostAsJsonAsync($"{BaseUrl(fonoId)}/calcular", new { });
        var calcResult = await calcRes.Content.ReadFromJsonAsync<ParticipacoesResponse>();
        var pid = calcResult!.Participacoes.First(p => p.Categoria == "INTERPRETE").Id;

        var res = await _client.DeleteAsync($"{BaseUrl(fonoId)}/{pid}");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await res.Content.ReadFromJsonAsync<ParticipacoesResponse>();
        result!.PercentuaisDesatualizados.Should().BeTrue();
        result.Participacoes.Should().HaveCount(1); // só sobrou o produtor
    }

    [Fact]
    public async Task Delete_ExcluirTitular_ComParticipacoesConexas_Retorna409()
    {
        var obraId = await SeedObraAsync();
        var fonoId = await SeedFonogramaAsync(obraId);
        var interprete = await SeedTitularAsync("Int Nao Excluir");

        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(interprete, "INTERPRETE"));

        var res = await _client.DeleteAsync($"/api/v1/titulares/{interprete}");
        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Post_AdicionarMesmoTitular_CategoriasDiferentes_Aceita()
    {
        var obraId = await SeedObraAsync();
        var fonoId = await SeedFonogramaAsync(obraId);
        var titularId = await SeedTitularAsync("Ed Motta One Man");

        await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(titularId, "INTERPRETE"));
        var res = await _client.PostAsJsonAsync(BaseUrl(fonoId), new AdicionarParticipacaoRequest(titularId, "MUSICO_EXECUTANTE"));

        // mesmo titular, categoria diferente → aceita (RF-02)
        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = await res.Content.ReadFromJsonAsync<ParticipacoesResponse>();
        result!.Participacoes.Should().HaveCount(2);
    }
}
