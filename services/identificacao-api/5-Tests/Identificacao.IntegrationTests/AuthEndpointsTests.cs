using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using AwesomeAssertions;
using Ecad.Authz.Sdk;
using Identificacao.API.Authorization;
using Identificacao.IntegrationTests.Fixtures;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Identificacao.IntegrationTests;

/// <summary>
/// Verifica que a autorização fina (Ecad.Authz) está corretamente ligada
/// nos endpoints da Identificação API. Cobre uma rota por agrupamento de
/// permissão (captação, execução, rubrica, upload, pendente) com três
/// cenários: 401 sem token, 403 com authz negada, 2xx com authz aprovada.
/// </summary>
public class AuthEndpointsTests : IClassFixture<IdentificacaoApiFactory>
{
    private readonly IdentificacaoApiFactory _factory;

    public AuthEndpointsTests(IdentificacaoApiFactory factory)
    {
        _factory = factory;
    }

    // ── 401 sem token (testa um endpoint por agrupamento) ────────────────

    [Theory]
    [InlineData("/api/v1/captacoes?page=1&size=10")]
    [InlineData("/api/v1/rubricas")]
    [InlineData("/api/v1/tipos-utilizacao")]
    [InlineData("/api/v1/pendentes")]
    [InlineData("/api/v1/captacoes/00000000-0000-0000-0000-000000000000/uploads")]
    [InlineData("/api/v1/captacoes/00000000-0000-0000-0000-000000000000/execucoes")]
    public async Task Get_WithoutToken_Returns401(string url)
    {
        var client = _factory.CreateUnauthenticatedClient();

        var response = await client.GetAsync(url);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── 200 com authz default (mock allow) ───────────────────────────────

    [Fact]
    public async Task GetCaptacoes_WithAuthenticatedAndAllowed_Returns200()
    {
        var client = _factory.CreateAuthenticatedClient(roles: ["identificacao.consultor"]);

        var response = await client.GetAsync("/api/v1/captacoes?page=1&size=10");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetRubricas_WithAuthenticatedAndAllowed_Returns200()
    {
        var client = _factory.CreateAuthenticatedClient(roles: ["identificacao.consultor"]);

        var response = await client.GetAsync("/api/v1/rubricas");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetTiposUtilizacao_WithAuthenticatedAndAllowed_Returns200()
    {
        var client = _factory.CreateAuthenticatedClient(roles: ["identificacao.consultor"]);

        var response = await client.GetAsync("/api/v1/tipos-utilizacao");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetPendentes_WithAuthenticatedAndAllowed_Returns200()
    {
        var client = _factory.CreateAuthenticatedClient(roles: ["identificacao.consultor"]);

        var response = await client.GetAsync("/api/v1/pendentes");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── 403 quando o serviço de authz nega ───────────────────────────────

    [Fact]
    public async Task PostCaptacoes_WithConsultorRoleButAuthzDenied_Returns403()
    {
        // O consultor não tem identificacao:default:captacao:criar.
        // Forçamos o IEcadAuthzClient a retornar Allowed=false.
        var client = CreateClientWithDeniedAuthz(roles: "identificacao.consultor");

        var payload = new
        {
            rubricaId = Guid.NewGuid(),
            periodo = DateOnly.FromDateTime(DateTime.UtcNow),
            usuarioDeMusica = "Rádio Teste"
        };

        var response = await client.PostAsJsonAsync("/api/v1/captacoes", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostCancelarCaptacao_WithConsultorRoleButAuthzDenied_Returns403()
    {
        var client = CreateClientWithDeniedAuthz(roles: "identificacao.consultor");

        var captacaoId = Guid.NewGuid();
        var payload = new { justificativa = "qualquer", opcaoRecriacao = "NENHUMA" };

        var response = await client.PostAsJsonAsync($"/api/v1/captacoes/{captacaoId}/cancelar", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostResolverPendente_WithConsultorRoleButAuthzDenied_Returns403()
    {
        var client = CreateClientWithDeniedAuthz(roles: "identificacao.consultor");

        var pendenteId = Guid.NewGuid();
        var payload = new { obraId = Guid.NewGuid(), fonogramaId = (Guid?)null };

        var response = await client.PostAsJsonAsync($"/api/v1/pendentes/{pendenteId}/resolver", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostExecucao_WithConsultorRoleButAuthzDenied_Returns403()
    {
        var client = CreateClientWithDeniedAuthz(roles: "identificacao.consultor");

        var captacaoId = Guid.NewGuid();
        var payload = new
        {
            tipoUtilizacaoId = Guid.NewGuid(),
            obra = "qualquer",
            interprete = "qualquer",
            duracaoSegundos = 180
        };

        var response = await client.PostAsJsonAsync($"/api/v1/captacoes/{captacaoId}/execucoes", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── CT-IDF-R07: sanity check do catálogo declarado ────────────────────

    [Fact]
    public void IdentificacaoPermissions_Catalog_HasExpectedShape()
    {
        // Garante que IdentificacaoPermissions.cs mantém as 20 permissões 4-seg
        // declaradas (alinhado com docs/authz/catalog/identificacao.md e o seed).
        var permissions = typeof(IdentificacaoPermissions)
            .GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy)
            .Where(f => f.IsLiteral && !f.IsInitOnly && f.FieldType == typeof(string))
            .Select(f => (string)f.GetRawConstantValue()!)
            .ToList();

        permissions.Should().HaveCount(22, "o catálogo de Identificação deve manter as 22 permissões 4-segmentos declaradas");
        permissions.Should().OnlyContain(p => p.StartsWith("identificacao:default:"), "todas as permissões do catálogo devem ser 4-seg no domínio identificacao:default");
        permissions.Distinct().Should().HaveCount(permissions.Count, "não deve haver chaves duplicadas no catálogo");
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /// <summary>
    /// Constrói um client com identidade autenticada (via header) e com o
    /// <see cref="IEcadAuthzClient"/> substituído por um mock que nega
    /// qualquer verificação — simulando ausência da permissão exigida.
    /// </summary>
    private HttpClient CreateClientWithDeniedAuthz(string roles)
    {
        var deniedMock = new Mock<IEcadAuthzClient>();
        deniedMock
            .Setup(c => c.CheckAsync(
                It.IsAny<AuthzCheckRequest>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthzDecision(false, "DENIED_TEST", 0));

        return _factory.CreateAuthenticatedClient(
            configureWebHost: builder => builder.ConfigureTestServices(services =>
            {
                var descriptors = services
                    .Where(d => d.ServiceType == typeof(IEcadAuthzClient))
                    .ToList();
                foreach (var d in descriptors)
                {
                    services.Remove(d);
                }
                services.AddSingleton(deniedMock.Object);
            }),
            roles: roles);
    }
}
