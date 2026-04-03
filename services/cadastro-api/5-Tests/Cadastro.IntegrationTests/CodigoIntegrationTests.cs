using System.Net.Http.Json;
using System.Text.Json;
using Cadastro.API;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Obras.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Enums;
using Cadastro.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Cadastro.IntegrationTests;

public class CodigoIntegrationTests : IClassFixture<CadastroApiFactory>, IAsyncLifetime
{
    private readonly HttpClient _client;
    private readonly CadastroApiFactory _factory;
    private readonly JsonSerializerOptions _jsonOptions;

    // We store an associacaoId for creating Titulares/Obras
    private Guid _associacaoId;

    public CodigoIntegrationTests(CadastroApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Add("Test-User-Role", "SystemAdmin");
        _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
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

    public async Task InitializeAsync()
    {
        // Get a valid associacaoId to use for Titular creation
        var response = await _client.GetAsync("/api/v1/associacoes");
        var content = await response.Content.ReadAsStringAsync();
        var list = JsonSerializer.Deserialize<List<AssociacaoResponse>>(content, _jsonOptions);
        _associacaoId = list!.First().Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(DisplayName = "GET /associacoes deve retornar codigo de 1 a 7 provenientes do seed")]
    public async Task GetAssociacoes_DeveRetornarCodigo1A7()
    {
        var response = await _client.GetAsync("/api/v1/associacoes");
        response.EnsureSuccessStatusCode();

        var associacoes = await response.Content.ReadFromJsonAsync<List<AssociacaoResponse>>(_jsonOptions);

        associacoes.Should().NotBeNull();
        associacoes.Should().HaveCount(7);
        associacoes!.Select(a => a.Codigo).Should().OnlyHaveUniqueItems();
        associacoes.Select(a => (int)a.Codigo).Should().Contain(new[] { 1, 2, 3, 4, 5, 6, 7 });
    }

    [Fact(DisplayName = "POST /titulares deve retornar codigo autoincremental e persistir após PUT")]
    public async Task Titular_FluxoCriacaoEdicao_ValidaCodigo()
    {
        // 1. Criar o primeiro titular
        var criacao1 = new
        {
            Nome = "Titular Auto Codigo 1",
            Tipo = "PF",
            Documento = GerarCpfValido(), // Generate a valid CPF
            Nacionalidade = "Brasileira",
            AssociacaoId = _associacaoId
        };
        var resp1 = await _client.PostAsJsonAsync("/api/v1/titulares", criacao1);
        if(!resp1.IsSuccessStatusCode) throw new Exception(await resp1.Content.ReadAsStringAsync());
        var titular1 = await resp1.Content.ReadFromJsonAsync<TitularResponse>(_jsonOptions);

        titular1.Should().NotBeNull();
        titular1!.Codigo.Should().BeGreaterThan(0);
        var codigoGerado1 = titular1.Codigo;

        // 2. Criar o segundo titular e validar que o codigo incrementa
        var criacao2 = new
        {
            Nome = "Titular Auto Codigo 2",
            Tipo = "PF",
            Documento = GerarCpfValido(),
            Nacionalidade = "Brasileira",
            AssociacaoId = _associacaoId
        };
        var resp2 = await _client.PostAsJsonAsync("/api/v1/titulares", criacao2);
        if(!resp2.IsSuccessStatusCode) throw new Exception(await resp2.Content.ReadAsStringAsync());
        var titular2 = await resp2.Content.ReadFromJsonAsync<TitularResponse>(_jsonOptions);

        titular2!.Codigo.Should().BeGreaterThan(codigoGerado1);

        // 3. Testar filtragem: GET /titulares?codigo=codigoGerado1
        var listResp = await _client.GetAsync($"/api/v1/titulares?codigo={codigoGerado1}");
        var titularList = await listResp.Content.ReadFromJsonAsync<TitularListResponse>(_jsonOptions);
        
        titularList.Should().NotBeNull();
        titularList!.Data.Should().ContainSingle(t => t.Codigo == codigoGerado1);

        // 4. Testar filtragem vazia: GET /titulares?codigo=999999
        var emptyResp = await _client.GetAsync($"/api/v1/titulares?codigo=999999");
        var emptyList = await emptyResp.Content.ReadFromJsonAsync<TitularListResponse>(_jsonOptions);
        emptyList!.Data.Should().BeEmpty();

        // 5. Testar que o codigo nunca muda apos edição
        var edicao = new
        {
            Nome = "Titular Nome Editado",
            Nacionalidade = "Argentina",
            AssociacaoId = _associacaoId,
            Status = "PendenteValidacao"
        };
        var putResp = await _client.PutAsJsonAsync($"/api/v1/titulares/{titular1.Id}", edicao);
        putResp.EnsureSuccessStatusCode();
        var titularEditado = await putResp.Content.ReadFromJsonAsync<TitularResponse>(_jsonOptions);

        titularEditado!.Codigo.Should().Be(codigoGerado1); // Garante que Codigo é imutável
    }

    [Fact(DisplayName = "Depuração de Obra deve gerar nova obra com código diferente (maior)")]
    public async Task Obra_Depuracao_DeveGerarNovaObraComNovoCodigoMaior()
    {
        // 1. Criar Obra Musical original
        var criarObraReq = new
        {
            Titulo = "Obra Antiga Depuracao",
            Tipo = "MUSICAL",
            Genero = "Rock"
        };
        var postObra = await _client.PostAsJsonAsync("/api/v1/obras", criarObraReq);
        postObra.EnsureSuccessStatusCode();
        var obraOriginal = await postObra.Content.ReadFromJsonAsync<ObraResponse>(_jsonOptions);

        obraOriginal.Should().NotBeNull();
        obraOriginal!.Codigo.Should().BeGreaterThan(0);
        var codigoOriginal = obraOriginal.Codigo;

        // 2. Definir a obra como LIBERADO diretamente no banco para contornar validações complexas focado no teste de Codigo
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Cadastro.Infra.Data.CadastroDbContext>();
            var obraDb = await db.ObrasMusicais.FindAsync(obraOriginal.Id);
            obraDb!.Liberar();
            await db.SaveChangesAsync();
        }

        // 3. Depurar a obra
        var depurarReq = new
        {
            Titulo = "Obra Nova Depuracao",
            Tipo = "MUSICAL",
            Genero = "Rock Alternativo"
        };
        var depurarResp = await _client.PostAsJsonAsync($"/api/v1/obras/{obraOriginal.Id}/depurar", depurarReq);
        if(!depurarResp.IsSuccessStatusCode) throw new Exception(await depurarResp.Content.ReadAsStringAsync());

        // No depurar, o endpoint de obras retorna um JSON anônimo no momento, ou DepuracaoResponse
        var depuracaoResp = await depurarResp.Content.ReadFromJsonAsync<Cadastro.Application.Obras.Responses.DepuracaoResponse>(_jsonOptions);

        depuracaoResp.Should().NotBeNull();
        depuracaoResp!.ObraDepurada.Should().NotBeNull();
        depuracaoResp.NovaObra.Should().NotBeNull();

        // Compara os códigos
        depuracaoResp.ObraDepurada.Codigo.Should().Be(codigoOriginal);
        depuracaoResp.NovaObra.Codigo.Should().BeGreaterThan(codigoOriginal);
    }
}
