using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using AwesomeAssertions;
using Cadastro.API.Authorization;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;
using Ecad.Authz.Sdk;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Cadastro.IntegrationTests;

public class AuthEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public AuthEndpointsTests(CadastroApiFactory factory)
    {
        _factory = factory;
    }

    // ── CT-CAD-R01: sem JWT → 401 (matriz por endpoint) ────────────────────

    [Theory]
    [InlineData("/api/v1/associacoes")]
    [InlineData("/api/v1/titulares?page=1&size=10")]
    [InlineData("/api/v1/obras?page=1&size=10")]
    [InlineData("/api/v1/fonogramas?page=1&size=10")]
    public async Task GetEndpoint_WithoutToken_Returns401(string path)
    {
        var client = _factory.CreateUnauthenticatedClient();

        var response = await client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── CT-CAD-R02: com JWT mas authz nega → 403 PERMISSION_DENIED ────────

    [Theory]
    [InlineData("/api/v1/associacoes", CadastroPermissions.AssociacaoListar)]
    [InlineData("/api/v1/titulares?page=1&size=10", CadastroPermissions.TitularListar)]
    [InlineData("/api/v1/obras?page=1&size=10", CadastroPermissions.ObraListar)]
    [InlineData("/api/v1/fonogramas?page=1&size=10", CadastroPermissions.FonogramaListar)]
    public async Task GetEndpoint_WhenAuthzDeniesPermission_Returns403(string path, string deniedPermission)
    {
        var client = CreateClientWithAuthzDecision(allowed: false, expectedPermission: deniedPermission);

        var response = await client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── CT-CAD-R03: com JWT e authz permite → 200 ─────────────────────────

    [Theory]
    [InlineData("/api/v1/associacoes")]
    [InlineData("/api/v1/titulares?page=1&size=10")]
    [InlineData("/api/v1/obras?page=1&size=10")]
    [InlineData("/api/v1/fonogramas?page=1&size=10")]
    public async Task GetEndpoint_WhenAuthzAllows_Returns200(string path)
    {
        // O factory padrão já mocka IEcadAuthzClient para "allowed: true".
        var client = _factory.CreateAuthenticatedClient(roles: ["consultor"]);

        var response = await client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Cenários consolidados de regressão ─────────────────────────────────

    [Fact]
    public async Task GetTitulares_WithoutToken_Returns401()
    {
        var client = _factory.CreateUnauthenticatedClient();

        var response = await client.GetAsync("/api/v1/titulares?page=1&size=10");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetTitulares_WithConsultorRole_Returns200()
    {
        var client = _factory.CreateAuthenticatedClient(roles: ["consultor"]);

        var response = await client.GetAsync("/api/v1/titulares?page=1&size=10");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PostTitulares_WithConsultorRole_Returns403()
    {
        // CT-CAD-R04: consultor sem 'titular:criar' recebe 403.
        var client = CreateClientWithAuthzDecision(
            allowed: false,
            expectedPermission: CadastroPermissions.TitularCriar,
            role: "consultor");

        var associacoes = await _factory
            .CreateAuthenticatedClient()
            .GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var request = new CriarTitularRequest("Consultor Bloqueado", "PF", "12345678909", "Brasileiro", associacoes![0].Id, null);

        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostTitulares_WithAnalistaRole_ReturnsCreated()
    {
        // CT-CAD-R05: analista com permissão recebe 201.
        var client = _factory.CreateAuthenticatedClient(roles: ["analista-cadastro"]);
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var request = new CriarTitularRequest($"Analista {Guid.NewGuid():N}", "PF", GenerateValidCpf(), "Brasileiro", associacoes![0].Id, null);

        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<TitularResponse>();
        created.Should().NotBeNull();
    }

    // ── CT-CAD-R07: sanity check do catálogo declarado ────────────────────

    [Fact]
    public void CadastroPermissions_Catalog_HasExpectedShape()
    {
        // Garante que o catálogo declarado em CadastroPermissions.cs continua
        // alinhado com o seed (seeds/mcad/cadastro.permissions.json) e com o
        // checklist da Tarefa 20 do PRD original.
        var permissions = typeof(CadastroPermissions)
            .GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy)
            .Where(f => f.IsLiteral && !f.IsInitOnly && f.FieldType == typeof(string))
            .Select(f => (string)f.GetRawConstantValue()!)
            .ToList();

        permissions.Should().HaveCount(41, "o catálogo de Cadastro deve manter as 41 permissões 4-segmentos declaradas");
        permissions.Should().OnlyContain(p => p.StartsWith("cadastro:default:"), "todas as permissões do catálogo devem ser 4-seg no domínio cadastro:default");
        permissions.Distinct().Should().HaveCount(permissions.Count, "não deve haver chaves duplicadas no catálogo");
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private HttpClient CreateClientWithAuthzDecision(bool allowed, string expectedPermission, string role = "consultor")
    {
        var authzMock = new Mock<IEcadAuthzClient>();
        authzMock
            .Setup(c => c.CheckAsync(
                It.Is<AuthzCheckRequest>(r => r.Permission == expectedPermission),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthzDecision(allowed, allowed ? "ALLOWED_TEST" : "DENIED_TEST", 0));
        // Demais permissões: comportamento neutro (allowed) para não interferir.
        authzMock
            .Setup(c => c.CheckAsync(
                It.Is<AuthzCheckRequest>(r => r.Permission != expectedPermission),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthzDecision(true, "ALLOWED_TEST", 0));

        return _factory.CreateAuthenticatedClient(
            builder => builder.ConfigureTestServices(services =>
            {
                var desc = services.SingleOrDefault(d => d.ServiceType == typeof(IEcadAuthzClient));
                if (desc != null) services.Remove(desc);
                services.AddSingleton(authzMock.Object);
            }),
            role);
    }

    private static string GenerateValidCpf()
    {
        var random = new Random();
        var digits = new int[9];
        for (var index = 0; index < digits.Length; index++)
        {
            digits[index] = random.Next(0, 10);
        }

        var firstVerifierSum = 0;
        for (var index = 0; index < digits.Length; index++)
        {
            firstVerifierSum += digits[index] * (10 - index);
        }

        var firstVerifier = firstVerifierSum % 11 < 2 ? 0 : 11 - (firstVerifierSum % 11);
        var secondVerifierSum = 0;
        for (var index = 0; index < digits.Length; index++)
        {
            secondVerifierSum += digits[index] * (11 - index);
        }

        secondVerifierSum += firstVerifier * 2;
        var secondVerifier = secondVerifierSum % 11 < 2 ? 0 : 11 - (secondVerifierSum % 11);
        return $"{string.Join(string.Empty, digits)}{firstVerifier}{secondVerifier}";
    }
}
