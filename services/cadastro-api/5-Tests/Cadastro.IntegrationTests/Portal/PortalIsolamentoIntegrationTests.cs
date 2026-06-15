using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Endpoints;
using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Portal.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.IntegrationTests.Fixtures;

namespace Cadastro.IntegrationTests.Portal;

public class PortalIsolamentoIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public PortalIsolamentoIntegrationTests(CadastroApiFactory factory)
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

    private async Task<(Guid TitularId, string Documento)> CriarTitularComCredencialAsync(
        string caeIpi = "999.999.99.99", string senha = "Senha@123")
    {
        var client = _factory.CreateAuthenticatedClient();
        var associacoes = await client.GetFromJsonAsync<List<AssociacaoResponse>>("/api/v1/associacoes");
        var cpf = GerarCpfValido();
        var request = new CriarTitularRequest(
            $"Titular Iso {Guid.NewGuid():N}",
            "PF",
            cpf,
            "BR",
            associacoes![0].Id,
            caeIpi);
        var response = await client.PostAsJsonAsync("/api/v1/titulares", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var titular = await response.Content.ReadFromJsonAsync<TitularResponse>();

        var anonClient = _factory.CreateUnauthenticatedClient();
        var autoRes = await anonClient.PostAsJsonAsync("/api/v1/portal/auto-cadastro",
            new AutoCadastroTitularRequest(cpf, caeIpi, senha));
        autoRes.StatusCode.Should().Be(HttpStatusCode.Created);

        return (titular!.Id, cpf);
    }

    [Fact]
    public async Task RF31_TitularA_NaoVeOcorrenciasDoTitularB()
    {
        // Criar Titular A e Titular B
        var (titularAId, _) = await CriarTitularComCredencialAsync(senha: "Senha@123A");
        var (titularBId, documentoB) = await CriarTitularComCredencialAsync(caeIpi: "888.888.88.88", senha: "Senha@123B");

        // Titular A abre uma ocorrência
        var clientA = _factory.CreateTitularClient(titularAId);
        var ocorrAReq = new CriarOcorrenciaRequest("DADO_CADASTRAL", null, null, "Erro A — descrição com pelo menos 10 caracteres");
        var ocorrARes = await clientA.PostAsJsonAsync("/api/v1/portal/ocorrencias", ocorrAReq);
        ocorrARes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Titular B abre uma ocorrência
        var clientB = _factory.CreateTitularClient(titularBId);
        var ocorrBReq = new CriarOcorrenciaRequest("DADO_CADASTRAL", null, null, "Erro B — descrição com pelo menos 10 caracteres");
        var ocorrBRes = await clientB.PostAsJsonAsync("/api/v1/portal/ocorrencias", ocorrBReq);
        ocorrBRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Titular A lista suas ocorrências — vê apenas as suas (RF-31)
        var listaARes = await clientA.GetAsync("/api/v1/portal/ocorrencias");
        listaARes.StatusCode.Should().Be(HttpStatusCode.OK);
        var listaA = await listaARes.Content.ReadFromJsonAsync<MinhasOcorrenciasResponse>();
        listaA.Should().NotBeNull();
        listaA!.Data.Should().OnlyContain(o => o.Tipo == "DADO_CADASTRAL");
        // Cada item na lista de A não deve conter o ID da ocorrência de B
        listaA.Data.Should().NotContain(o => o.Descricao == "Erro B — descrição com pelo menos 10 caracteres");

        // Titular B lista suas ocorrências — vê apenas as suas
        var listaBRes = await clientB.GetAsync("/api/v1/portal/ocorrencias");
        listaBRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var listaB = await listaBRes.Content.ReadFromJsonAsync<MinhasOcorrenciasResponse>();
        listaB!.Data.Should().NotContain(o => o.Descricao == "Erro A — descrição com pelo menos 10 caracteres");
    }

    [Fact]
    public async Task RF24_TitularA_NaoVeObrasDoTitularB()
    {
        var (titularAId, _) = await CriarTitularComCredencialAsync(senha: "Senha@123C");
        var (titularBId, _) = await CriarTitularComCredencialAsync(caeIpi: "777.777.77.77", senha: "Senha@123D");

        // Criar obra e associar ao Titular B via cliente interno
        var clientAnalyst = _factory.CreateAuthenticatedClient();
        var postRes = await clientAnalyst.PostAsJsonAsync("/api/v1/obras",
            new Cadastro.Application.Obras.Commands.CriarObraCommand("Obra Iso RF24", null, "MUSICAL", "Rock"));
        postRes.EnsureSuccessStatusCode();
        var obra = await postRes.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var obraId = Guid.Parse(obra.GetProperty("id").GetString()!);

        await clientAnalyst.PostAsJsonAsync($"/api/v1/obras/{obraId}/titularidades",
            new Cadastro.API.Endpoints.AdicionarTitularidadeRequest(titularBId, "AUTOR", 100.0m));

        // Titular B vê a obra
        var clientB = _factory.CreateTitularClient(titularBId);
        var obrasBRes = await clientB.GetAsync("/api/v1/portal/minhas-obras");
        obrasBRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var obrasB = await obrasBRes.Content.ReadFromJsonAsync<MinhasObrasResponse>();
        obrasB!.Data.Should().NotBeEmpty();

        // Titular A NÃO vê a obra de B (RF-24)
        var clientA = _factory.CreateTitularClient(titularAId);
        var obrasARes = await clientA.GetAsync("/api/v1/portal/minhas-obras");
        obrasARes.StatusCode.Should().Be(HttpStatusCode.OK);
        var obrasA = await obrasARes.Content.ReadFromJsonAsync<MinhasObrasResponse>();
        obrasA!.Data.Should().BeEmpty();
    }
}
