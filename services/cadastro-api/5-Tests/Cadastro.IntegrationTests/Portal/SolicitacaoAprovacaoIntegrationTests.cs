using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests.Portal;

public class SolicitacaoAprovacaoIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public SolicitacaoAprovacaoIntegrationTests(CadastroApiFactory factory)
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

    private async Task<(Guid TitularId, string Documento, string NomeOriginal)> CriarTitularComCredencialAsync()
    {
        var client = _factory.CreateAuthenticatedClient();
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var cpf = GerarCpfValido();
        var nome = $"Titular Solicitacao {Guid.NewGuid():N}";
        var request = new CriarTitularRequest(
            nome,
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

        return (titular!.Id, cpf, titular.Nome);
    }

    private HttpClient CreateAnalystClient()
    {
        return _factory.CreateAuthenticatedClientWithPermissions(
            "analista.dev",
            "analista-cadastro",
            "cadastro:default:solicitacao-alteracao:aprovar",
            "cadastro:default:solicitacao-alteracao:rejeitar",
            "cadastro:default:solicitacao-alteracao:listar");
    }

    [Fact]
    public async Task RF20_TitularAbreSolicitacaoAssociacao_SemDestino_Retorna422()
    {
        var (titularId, _, _) = await CriarTitularComCredencialAsync();
        var titularClient = _factory.CreateTitularClient(titularId);

        var req = new AbrirSolicitacaoRequest(
            Campo: "ASSOCIACAO",
            ValorPretendido: "",
            Justificativa: "Quero remover minha associação — isso deveria ser recusado");

        var response = await titularClient.PostAsJsonAsync("/api/v1/portal/solicitacoes-alteracao", req);
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task RF16_AnalistaAprovaSolicitacaoNome_TitularRefleteNovoNome()
    {
        var (titularId, _, nomeOriginal) = await CriarTitularComCredencialAsync();
        var titularClient = _factory.CreateTitularClient(titularId);

        // Verificar nome original via GET /portal/me
        var meBefore = await titularClient.GetFromJsonAsync<MeuTitularResponse>("/api/v1/portal/me");
        meBefore!.Nome.Should().Be(nomeOriginal);

        // Titular abre solicitação para alterar NOME
        var req = new AbrirSolicitacaoRequest(
            Campo: "NOME",
            ValorPretendido: "Nome Alterado SM",
            Justificativa: "Meu nome foi registrado incorretamente no cadastro original");
        var solRes = await titularClient.PostAsJsonAsync("/api/v1/portal/solicitacoes-alteracao", req);
        solRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var sol = await solRes.Content.ReadFromJsonAsync<SolicitacaoResponse>();
        sol!.Status.Should().Be("SOLICITADA");

        // Analista aprova a solicitação
        var analystClient = CreateAnalystClient();
        var aprovarRes = await analystClient.PostAsync($"/api/v1/solicitacoes-alteracao/{sol.Id}/aprovar", null);
        aprovarRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var aprovada = await aprovarRes.Content.ReadFromJsonAsync<SolicitacaoResponse>();
        aprovada!.Status.Should().Be("APROVADA");

        // Titular vê o nome atualizado
        var meAfter = await titularClient.GetFromJsonAsync<MeuTitularResponse>("/api/v1/portal/me");
        meAfter!.Nome.Should().Be("Nome Alterado SM");
    }

    [Fact]
    public async Task AnalistaSemPermissaoAprovar_Retorna403()
    {
        var (titularId, _, _) = await CriarTitularComCredencialAsync();
        var titularClient = _factory.CreateTitularClient(titularId);

        var req = new AbrirSolicitacaoRequest(
            Campo: "NOME",
            ValorPretendido: "Nome 403",
            Justificativa: "Justificativa com mais de 10 caracteres para passar validação");
        var solRes = await titularClient.PostAsJsonAsync("/api/v1/portal/solicitacoes-alteracao", req);
        solRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var sol = await solRes.Content.ReadFromJsonAsync<SolicitacaoResponse>();

        var noPermClient = _factory.CreateAuthenticatedClientWithPermissions(
            "consultor.dev",
            "consultor",
            "cadastro:default:solicitacao-alteracao:listar");

        var aprovarRes = await noPermClient.PostAsync($"/api/v1/solicitacoes-alteracao/{sol!.Id}/aprovar", null);
        aprovarRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
