using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Identificacao.IntegrationTests.Fixtures;

namespace Identificacao.IntegrationTests;

public class CaptacaoEndpointsValidationTests : IClassFixture<IdentificacaoApiFactory>
{
    private readonly IdentificacaoApiFactory _factory;

    public CaptacaoEndpointsValidationTests(IdentificacaoApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostCaptacoes_ComSchemaLegadoUsuarioDeMusica_RetornaBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient(roles: ["identificacao.analista"]);
        var payload = new
        {
            rubricaId = Guid.NewGuid(),
            periodo = "2026-06-19",
            usuarioDeMusica = "QA-F01-Valida"
        };

        var response = await client.PostAsJsonAsync("/api/v1/captacoes", payload);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemResponse>();

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        problem.Should().NotBeNull();
        problem!.Code.Should().Be("VALIDATION_ERROR");
        problem!.Errors.Should().ContainKey("UsuarioMusicaId");
        problem.Errors.Should().ContainKey("UsuarioMusicaNome");
    }

    [Fact]
    public async Task PostCaptacoes_ComBodyVazio_RetornaBadRequestComErrosDeValidacao()
    {
        var client = _factory.CreateAuthenticatedClient(roles: ["identificacao.analista"]);
        var payload = new { };

        var response = await client.PostAsJsonAsync("/api/v1/captacoes", payload);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemResponse>();

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        problem.Should().NotBeNull();
        problem!.Code.Should().Be("VALIDATION_ERROR");
        problem.Errors.Should().ContainKey("RubricaId");
        problem.Errors.Should().ContainKey("Periodo");
        problem.Errors.Should().ContainKey("UsuarioMusicaId");
        problem.Errors.Should().ContainKey("UsuarioMusicaNome");
    }

    private sealed record ValidationProblemResponse(
        string Title,
        int Status,
        string Detail,
        string Code,
        Dictionary<string, string[]> Errors);
}
