using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Entities;
using Cadastro.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.IntegrationTests.Portal;

public class PortalFluxoCompletoIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public PortalFluxoCompletoIntegrationTests(CadastroApiFactory factory)
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

    private async Task<(Guid TitularId, string Documento)> CriarTitularAsync()
    {
        var client = _factory.CreateAuthenticatedClient();
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var cpf = GerarCpfValido();
        var request = new CriarTitularRequest(
            $"Titular Fluxo {Guid.NewGuid():N}",
            "PF",
            cpf,
            "BR",
            associacoes![0].Id,
            "999.999.99.99");
        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var titular = await response.Content.ReadFromJsonAsync<TitularResponse>();
        return (titular!.Id, cpf);
    }

    [Fact]
    public async Task FluxoCompleto_AutoCadastro_Login_Me_Contato_MinhasObras_Ocorrencia_Outbox()
    {
        var (titularId, documento) = await CriarTitularAsync();

        // 1. POST /portal/auto-cadastro (sem token) → 201
        var anonClient = _factory.CreateUnauthenticatedClient();
        var autoCadastroRequest = new AutoCadastroTitularRequest(documento, "999.999.99.99", "Senha@123");
        var autoCadastroRes = await anonClient.PostAsJsonAsync("/api/v1/portal/auto-cadastro", autoCadastroRequest);
        autoCadastroRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var autoCadastroBody = await autoCadastroRes.Content.ReadFromJsonAsync<AutoCadastroResponse>();
        autoCadastroBody.Should().NotBeNull();
        autoCadastroBody!.Titular.Id.Should().Be(titularId);

        // 2. POST /portal/auth/login → 200 com token
        var loginRequest = new LoginTitularRequest(documento, "Senha@123");
        var loginRes = await anonClient.PostAsJsonAsync("/api/v1/portal/auth/login", loginRequest);
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>();
        loginBody.Should().NotBeNull();
        loginBody!.Token.Should().NotBeNullOrEmpty();
        loginBody.Titular.Id.Should().Be(titularId);

        // 3. GET /portal/me com token titular → 200
        var titularClient = _factory.CreateTitularClient(titularId);
        var meRes = await titularClient.GetAsync("/api/v1/portal/me");
        meRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var meBody = await meRes.Content.ReadFromJsonAsync<MeuTitularResponse>();
        meBody.Should().NotBeNull();
        meBody!.Id.Should().Be(titularId);

        // 4. PUT /portal/me/contato → 200; GET /portal/me reflete a mudança
        var contatoRequest = new AtualizarContatoRequest(
            Email: "titular@teste.com.br",
            Endereco: null,
            Telefones: [new TelefoneDto("CELULAR", "11999999999")]);
        var contatoRes = await titularClient.PutAsJsonAsync("/api/v1/portal/me/contato", contatoRequest);
        contatoRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var meAfterRes = await titularClient.GetAsync("/api/v1/portal/me");
        var meAfterBody = await meAfterRes.Content.ReadFromJsonAsync<MeuTitularResponse>();
        meAfterBody!.Contato.Should().NotBeNull();
        meAfterBody.Contato!.Email.Should().Be("titular@teste.com.br");
        meAfterBody.Contato.Telefones.Should().ContainSingle(t => t.Tipo == "CELULAR" && t.Numero == "11999999999");

        // 5. GET /portal/minhas-obras → retorna apenas obras do titular (RF-24)
        var obrasRes = await titularClient.GetAsync("/api/v1/portal/minhas-obras");
        obrasRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 6. POST /portal/ocorrencias → 201
        var ocorrenciaRequest = new CriarOcorrenciaRequest(
            Tipo: "DADO_CADASTRAL",
            ObraId: null,
            FonogramaId: null,
            Descricao: "Endereço incorreto no cadastro da obra X");
        var ocorrenciaRes = await titularClient.PostAsJsonAsync("/api/v1/portal/ocorrencias", ocorrenciaRequest);
        ocorrenciaRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var ocorrenciaBody = await ocorrenciaRes.Content.ReadFromJsonAsync<OcorrenciaResponse>();
        ocorrenciaBody.Should().NotBeNull();
        ocorrenciaBody!.Status.Should().Be("ABERTA");

        // 7. Verificar outbox_events com type = 'cadastro.ocorrencia.aberta'
        var options = new DbContextOptionsBuilder<Cadastro.Infra.Data.CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var context = new Cadastro.Infra.Data.CadastroDbContext(options);
        var outboxEvents = context.OutboxEvents
            .Where(e => e.Type == "cadastro.ocorrencia.aberta" && e.Subject == ocorrenciaBody.Id.ToString())
            .ToList();
        outboxEvents.Should().NotBeEmpty();
        outboxEvents.First().Payload.Should().Contain(ocorrenciaBody.Id.ToString());
    }
}
