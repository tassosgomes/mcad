using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests;

public class AuthEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public AuthEndpointsTests(CadastroApiFactory factory)
    {
        _factory = factory;
    }

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
        var client = _factory.CreateAuthenticatedClient(roles: ["consultor"]);
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var request = new CriarTitularRequest("Consultor Bloqueado", "PF", "12345678909", "Brasileiro", associacoes![0].Id, null);

        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostTitulares_WithAnalistaRole_ReturnsCreated()
    {
        var client = _factory.CreateAuthenticatedClient(roles: ["analista-cadastro"]);
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var request = new CriarTitularRequest($"Analista {Guid.NewGuid():N}", "PF", GenerateValidCpf(), "Brasileiro", associacoes![0].Id, null);

        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<TitularResponse>();
        created.Should().NotBeNull();
    }

    [Fact]
    public async Task GetHealth_WithoutToken_Returns200()
    {
        var client = _factory.CreateUnauthenticatedClient();

        var response = await client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
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