using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests.Portal;

public class OcorrenciaStateMachineIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public OcorrenciaStateMachineIntegrationTests(CadastroApiFactory factory)
    {
        _factory = factory;
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

    private async Task<(Guid TitularId, Guid OcorrenciaId)> CriarOcorrenciaAbertaAsync()
    {
        var client = _factory.CreateAuthenticatedClient();
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var cpf = GerarCpfValido();
        var request = new CriarTitularRequest(
            $"Titular SM {Guid.NewGuid():N}",
            "PF",
            cpf,
            "BR",
            associacoes![0].Id,
            "999.999.99.99");
        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);
        response.EnsureSuccessStatusCode();
        var titular = await response.Content.ReadFromJsonAsync<TitularResponse>();

        var anonClient = _factory.CreateUnauthenticatedClient();
        await anonClient.PostAsJsonAsync("/api/v1/portal/auto-cadastro",
            new AutoCadastroTitularRequest(cpf, "999.999.99.99", "Senha@123"));

        var titularClient = _factory.CreateTitularClient(titular!.Id);
        var ocorrReq = new CriarOcorrenciaRequest("DADO_CADASTRAL", null, null, "Erro na máquina de estados — teste de integração");
        var ocorrRes = await titularClient.PostAsJsonAsync("/api/v1/portal/ocorrencias", ocorrReq);
        ocorrRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var ocorrencia = await ocorrRes.Content.ReadFromJsonAsync<OcorrenciaResponse>();

        return (titular.Id, ocorrencia!.Id);
    }

    private HttpClient CreateAnalystClient()
    {
        return _factory.CreateAuthenticatedClientWithPermissions(
            "analista.dev",
            "analista-cadastro",
            "cadastro:default:ocorrencia:analisar",
            "cadastro:default:ocorrencia:resolver",
            "cadastro:default:ocorrencia:cancelar",
            "cadastro:default:ocorrencia:listar",
            "cadastro:default:ocorrencia:visualizar");
    }

    [Fact]
    public async Task RF37_Analista_MoveAberta_ParaEmAnalise_ParaResolvida()
    {
        var (_, ocorrenciaId) = await CriarOcorrenciaAbertaAsync();
        var analystClient = CreateAnalystClient();

        // ABERTA → EM_ANALISE (RF-34)
        var analisarRes = await analystClient.PostAsync($"/api/v1/ocorrencias/{ocorrenciaId}/analisar", null);
        analisarRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var emAnalise = await analisarRes.Content.ReadFromJsonAsync<OcorrenciaResponse>();
        emAnalise!.Status.Should().Be("EM_ANALISE");

        // EM_ANALISE → RESOLVIDA (RF-35)
        var resolverReq = new ResolverOcorrenciaRequest("Corrigido: titularidade ajustada");
        var resolverRes = await analystClient.PostAsJsonAsync($"/api/v1/ocorrencias/{ocorrenciaId}/resolver", resolverReq);
        resolverRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var resolvida = await resolverRes.Content.ReadFromJsonAsync<OcorrenciaResponse>();
        resolvida!.Status.Should().Be("RESOLVIDA");
        resolvida.Resolucao.Should().Be("Corrigido: titularidade ajustada");
    }

    [Fact]
    public async Task RF37_Resolvida_ParaAberta_Retorna422()
    {
        var (_, ocorrenciaId) = await CriarOcorrenciaAbertaAsync();
        var analystClient = CreateAnalystClient();

        // ABERTA → EM_ANALISE
        await analystClient.PostAsync($"/api/v1/ocorrencias/{ocorrenciaId}/analisar", null);

        // EM_ANALISE → RESOLVIDA
        var resolverReq = new ResolverOcorrenciaRequest("Resolvida");
        await analystClient.PostAsJsonAsync($"/api/v1/ocorrencias/{ocorrenciaId}/resolver", resolverReq);

        // RESOLVIDA → ABERTA (não deve permitir: RF-37)
        var analisarRes = await analystClient.PostAsync($"/api/v1/ocorrencias/{ocorrenciaId}/analisar", null);
        analisarRes.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task SemPermissao_Retorna403()
    {
        var (_, ocorrenciaId) = await CriarOcorrenciaAbertaAsync();

        var noPermClient = _factory.CreateAuthenticatedClientWithPermissions(
            "consultor.dev",
            "consultor",
            "cadastro:default:ocorrencia:listar",
            "cadastro:default:ocorrencia:visualizar");

        var analisarRes = await noPermClient.PostAsync($"/api/v1/ocorrencias/{ocorrenciaId}/analisar", null);
        analisarRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
