using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.IntegrationTests.Portal;

public class PortalOutboxIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public PortalOutboxIntegrationTests(CadastroApiFactory factory)
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

    private async Task<(Guid TitularId, string Documento)> CriarTitularComCredencialAsync()
    {
        var client = _factory.CreateAuthenticatedClient();
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var cpf = GerarCpfValido();
        var request = new CriarTitularRequest(
            $"Titular Outbox {Guid.NewGuid():N}",
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

        return (titular!.Id, cpf);
    }

    private List<Cadastro.Domain.Entities.OutboxEvent> GetOutboxEvents(string subject, string type)
    {
        var options = new DbContextOptionsBuilder<Cadastro.Infra.Data.CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var context = new Cadastro.Infra.Data.CadastroDbContext(options);
        return context.OutboxEvents
            .Where(e => e.Subject == subject && e.Type == type)
            .OrderByDescending(e => e.CreatedAt)
            .ToList();
    }

    [Fact]
    public async Task RF32_PostOcorrencias_GeraOutboxEvent_OcorrenciaAberta()
    {
        var (titularId, _) = await CriarTitularComCredencialAsync();
        var titularClient = _factory.CreateTitularClient(titularId);

        var ocorrReq = new CriarOcorrenciaRequest("DADO_CADASTRAL", null, null, "Teste de outbox — ocorrência aberta");
        var ocorrRes = await titularClient.PostAsJsonAsync("/api/v1/portal/ocorrencias", ocorrReq);
        ocorrRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var ocorrencia = await ocorrRes.Content.ReadFromJsonAsync<OcorrenciaResponse>();

        var eventos = GetOutboxEvents(ocorrencia!.Id.ToString(), "cadastro.ocorrencia.aberta");
        eventos.Should().NotBeEmpty();
        eventos.First().Payload.Should().Contain(ocorrencia.Id.ToString());
    }

    [Fact]
    public async Task RF13_PutContato_GeraOutboxEvent_ContatoAtualizado()
    {
        var (titularId, _) = await CriarTitularComCredencialAsync();
        var titularClient = _factory.CreateTitularClient(titularId);

        var contatoReq = new AtualizarContatoRequest(
            Email: "outbox@teste.com.br",
            Endereco: null,
            Telefones: []);
        var contatoRes = await titularClient.PutAsJsonAsync("/api/v1/portal/me/contato", contatoReq);
        contatoRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var eventos = GetOutboxEvents(titularId.ToString(), "cadastro.titular.contato.atualizado");
        eventos.Should().NotBeEmpty();
        eventos.First().Payload.Should().Contain(titularId.ToString());
    }
}
