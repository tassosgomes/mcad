using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests.Titulares;

public class TitularCpfMaskingTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public TitularCpfMaskingTests(CadastroApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetTitular_CallerWithVerCpfCompleto_ReturnsDocumentoCompleto()
    {
        var (titularId, documento, documentoFormatado) = await CreateTitularAsync();
        var client = _factory.CreateAuthenticatedClientWithPermissions(
            "analista.dev",
            "analista-cadastro",
            CadastroPermissionNames.TitularVerCpfCompleto);

        var response = await client.GetAsync($"/api/v1/titulares/{titularId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var titular = await response.Content.ReadFromJsonAsync<TitularResponse>();
        titular.Should().NotBeNull();
        titular!.Documento.Should().Be(documento);
        titular.DocumentoFormatado.Should().Be(documentoFormatado);
    }

    [Fact]
    public async Task GetTitular_CallerWithoutVerCpfCompleto_ReturnsDocumentoMascarado()
    {
        var (titularId, _, _) = await CreateTitularAsync();
        var client = _factory.CreateAuthenticatedClientWithPermissions("consultor.dev", "consultor");

        var response = await client.GetAsync($"/api/v1/titulares/{titularId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var titular = await response.Content.ReadFromJsonAsync<TitularResponse>();
        titular.Should().NotBeNull();
        titular!.Documento.Should().Be("XXXXXXXXXXX");
        titular.DocumentoFormatado.Should().Be("XXX.***.***-XX");
    }

    [Fact]
    public async Task ListTitulares_CallerWithoutVerCpfCompleto_ReturnsDocumentoMascarado()
    {
        var (_, documento, _) = await CreateTitularAsync();
        var client = _factory.CreateAuthenticatedClientWithPermissions("consultor.dev", "consultor");

        var response = await client.GetAsync($"/api/v1/titulares?page=1&size=10&documento={documento}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var titulares = await response.Content.ReadFromJsonAsync<TitularListResponse>();
        titulares.Should().NotBeNull();
        titulares!.Data.Should().ContainSingle();
        var titular = titulares.Data.Single();
        titular.Documento.Should().Be("XXXXXXXXXXX");
        titular.DocumentoFormatado.Should().Be("XXX.***.***-XX");
    }

    [Fact]
    public async Task GetTitular_WithoutToken_Returns401()
    {
        var client = _factory.CreateUnauthenticatedClient();

        var response = await client.GetAsync($"/api/v1/titulares/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<(Guid TitularId, string Documento, string DocumentoFormatado)> CreateTitularAsync()
    {
        var client = _factory.CreateAuthenticatedClientWithPermissions(
            "analista.dev",
            "analista-cadastro",
            CadastroPermissionNames.TitularVerCpfCompleto);
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var documento = GenerateValidCpf();
        var request = new CriarTitularRequest(
            $"Titular Masking {Guid.NewGuid():N}",
            "PF",
            documento,
            "BR",
            associacoes![0].Id,
            null);

        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var titular = await response.Content.ReadFromJsonAsync<TitularResponse>();
        titular.Should().NotBeNull();

        return (titular!.Id, documento, titular.DocumentoFormatado);
    }

    private static string GenerateValidCpf()
    {
        var seed = Guid.NewGuid().ToString("N")[..9];
        var digits = seed.Select(character => character % 10).ToArray();
        var firstVerifierSum = 0;
        for (var index = 0; index < digits.Length; index++)
        {
            firstVerifierSum += digits[index] * (10 - index);
        }

        var firstVerifier = firstVerifierSum % 11 < 2 ? 0 : 11 - firstVerifierSum % 11;
        var secondVerifierSum = 0;
        for (var index = 0; index < digits.Length; index++)
        {
            secondVerifierSum += digits[index] * (11 - index);
        }

        secondVerifierSum += firstVerifier * 2;
        var secondVerifier = secondVerifierSum % 11 < 2 ? 0 : 11 - secondVerifierSum % 11;
        return $"{string.Join(string.Empty, digits)}{firstVerifier}{secondVerifier}";
    }
}
