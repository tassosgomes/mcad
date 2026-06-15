using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests.Portal;

public class AuthRegressionIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public AuthRegressionIntegrationTests(CadastroApiFactory factory)
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

    [Fact]
    public async Task GetTitulares_RequerTokenKeycloak_NaoAceitaTokenTitular()
    {
        var client = _factory.CreateAuthenticatedClient();
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var cpf = GerarCpfValido();
        var request = new CriarTitularRequest(
            $"Regressão {Guid.NewGuid():N}",
            "PF",
            cpf,
            "BR",
            associacoes![0].Id,
            "999.999.99.99");
        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);
        response.EnsureSuccessStatusCode();
        var titular = await response.Content.ReadFromJsonAsync<TitularResponse>();

        // Com token Keycloak (analista): 200
        var keycloakRes = await client.GetAsync($"/api/v1/titulares/{titular!.Id}");
        keycloakRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Com token Titular: deve retornar 401 (não aceita scheme Titular)
        var titularClient = _factory.CreateTitularClient(titular.Id);
        var titularRes = await titularClient.GetAsync($"/api/v1/titulares/{titular.Id}");
        titularRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetTitulares_SemToken_Retorna401()
    {
        var anonClient = _factory.CreateUnauthenticatedClient();
        var response = await anonClient.GetAsync("/api/v1/titulares?page=1&size=10");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetTitulares_ComAnalistaKeycloak_Retorna200()
    {
        var client = _factory.CreateAuthenticatedClient();
        var response = await client.GetAsync("/api/v1/titulares?page=1&size=10");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
