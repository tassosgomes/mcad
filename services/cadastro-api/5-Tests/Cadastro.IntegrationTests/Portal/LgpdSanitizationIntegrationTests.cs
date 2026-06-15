using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests.Portal;

public class LgpdSanitizationIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public LgpdSanitizationIntegrationTests(CadastroApiFactory factory)
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
    public async Task GetPortalMe_MascaraDocumentoDoTitular()
    {
        var client = _factory.CreateAuthenticatedClient();
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var cpf = GerarCpfValido();
        var request = new CriarTitularRequest(
            $"Titular LGPD {Guid.NewGuid():N}",
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

        var titularClient = _factory.CreateTitularClient(titular!.Id);
        var meRes = await titularClient.GetAsync("/api/v1/portal/me");
        meRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var meBody = await meRes.Content.ReadFromJsonAsync<MeuTitularResponse>();

        meBody.Should().NotBeNull();
        // Documento mascarado: CPF deve ter apenas 3 primeiros dígitos visíveis
        meBody!.Documento.Should().EndWith("XXXXXXXX");
        meBody.Documento.Should().Be(cpf[..3] + "XXXXXXXX");
        meBody.DocumentoFormatado.Should().Be(cpf[..3] + ".***.***-XX");
        // Documento completo NÃO deve ser exposto
        meBody.Documento.Should().NotBe(cpf);
    }
}
