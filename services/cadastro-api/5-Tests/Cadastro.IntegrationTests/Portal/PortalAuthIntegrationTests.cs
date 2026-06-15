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

public class PortalAuthIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public PortalAuthIntegrationTests(CadastroApiFactory factory)
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

    private async Task<(Guid TitularId, string Documento)> CriarTitularComCredencialAsync(string senha = "Senha@123")
    {
        var client = _factory.CreateAuthenticatedClient();
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var cpf = GerarCpfValido();
        var request = new CriarTitularRequest(
            $"Titular Auth {Guid.NewGuid():N}",
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
            new AutoCadastroTitularRequest(cpf, "999.999.99.99", senha));

        return (titular!.Id, cpf);
    }

    [Fact]
    public async Task AutoCadastroELogin_AcessiveisSemToken()
    {
        var (titularId, documento) = await CriarTitularComCredencialAsync();

        var anonClient = _factory.CreateUnauthenticatedClient();

        // Auto-cadastro: 201 sem token
        var autoRes = await anonClient.PostAsJsonAsync("/api/v1/portal/auto-cadastro",
            new AutoCadastroTitularRequest(documento, "999.999.99.99", "NovaSenha@1"));
        autoRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Login: 200 sem token
        var loginRes = await anonClient.PostAsJsonAsync("/api/v1/portal/auth/login",
            new LoginTitularRequest(documento, "NovaSenha@1"));
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("/api/v1/portal/me")]
    [InlineData("/api/v1/portal/me/contato")]
    [InlineData("/api/v1/portal/minhas-obras")]
    [InlineData("/api/v1/portal/meus-fonogramas")]
    [InlineData("/api/v1/portal/ocorrencias")]
    [InlineData("/api/v1/portal/solicitacoes-alteracao")]
    public async Task EndpointsProtegidos_SemToken_Retorna401(string path)
    {
        var anonClient = _factory.CreateUnauthenticatedClient();

        var response = await anonClient.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CincoLoginsFalhados_AtivamLockoutExponencial()
    {
        var (titularId, documento) = await CriarTitularComCredencialAsync(senha: "SenhaCorreta");

        var anonClient = _factory.CreateUnauthenticatedClient();

        // 5 tentativas com senha errada
        for (int i = 0; i < 5; i++)
        {
            var loginRes = await anonClient.PostAsJsonAsync("/api/v1/portal/auth/login",
                new LoginTitularRequest(documento, "SenhaErrada!"));
            loginRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // 6ª tentativa com senha CORRETA também deve falhar (lockout ativo)
        var lockedRes = await anonClient.PostAsJsonAsync("/api/v1/portal/auth/login",
            new LoginTitularRequest(documento, "SenhaCorreta"));
        lockedRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task TokenKeycloak_NaoAutenticaSchemeTitular()
    {
        var (titularId, _) = await CriarTitularComCredencialAsync();

        // Cliente autenticado como Keycloak (analista) não deve acessar portal/me
        var keycloakClient = _factory.CreateAuthenticatedClient();
        var response = await keycloakClient.GetAsync($"/api/v1/portal/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Cliente sem token Titular também não deve acessar
        var anonClient = _factory.CreateUnauthenticatedClient();
        var response2 = await anonClient.GetAsync("/api/v1/portal/me");
        response2.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Mas com o Titular header, funciona
        var titularClient = _factory.CreateTitularClient(titularId);
        var response3 = await titularClient.GetAsync("/api/v1/portal/me");
        response3.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
