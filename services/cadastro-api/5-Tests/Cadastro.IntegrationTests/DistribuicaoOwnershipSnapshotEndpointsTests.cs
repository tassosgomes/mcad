using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.Application.Distribuicao.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.ValueObjects;
using Cadastro.Infra.Data;
using Cadastro.IntegrationTests.Fixtures;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cadastro.IntegrationTests;

public class DistribuicaoOwnershipSnapshotEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly CadastroApiFactory _factory;

    public DistribuicaoOwnershipSnapshotEndpointsTests(CadastroApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostOwnershipSnapshot_ComDadosSemeados_DeveRetornarSnapshotAutoralEConexo()
    {
        var seeded = await SeedOwnershipAsync();
        var client = _factory.CreateAuthenticatedClient();

        var response = await client.PostAsJsonAsync("/api/v1/distribuicao/ownership-snapshot", new
        {
            obraIds = new[] { seeded.ObraId },
            fonogramaIds = new[] { seeded.FonogramaId }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var snapshot = await response.Content.ReadFromJsonAsync<OwnershipSnapshotResponse>();
        snapshot.Should().NotBeNull();
        snapshot!.Obras.Should().ContainSingle();
        snapshot.Fonogramas.Should().ContainSingle();
        snapshot.Obras.Single().Titularidades.Should().Contain(t =>
            t.TitularId == seeded.AutorId &&
            t.Nome == "Autor Snapshot" &&
            t.AssociacaoSigla == seeded.AssociacaoSigla &&
            t.Categoria == "AUTOR" &&
            t.Percentual == 100m);
        snapshot.Fonogramas.Single().Participacoes.Should().Contain(p =>
            p.TitularId == seeded.InterpreteId &&
            p.Nome == "Interprete Snapshot" &&
            p.AssociacaoSigla == seeded.AssociacaoSigla &&
            p.Categoria == "INTERPRETE" &&
            p.Percentual == 100m);
        snapshot.Fonogramas.Single().ObraId.Should().Be(seeded.ObraId);
    }

    [Fact]
    public async Task PostOwnershipSnapshot_SemAutenticacao_DeveRetornar401()
    {
        var client = _factory.CreateUnauthenticatedClient();

        var response = await client.PostAsJsonAsync("/api/v1/distribuicao/ownership-snapshot", new
        {
            obraIds = Array.Empty<Guid>(),
            fonogramaIds = Array.Empty<Guid>()
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PostOwnershipSnapshot_ComIdInexistente_DeveRetornarProblemDetails()
    {
        var missingObraId = Guid.NewGuid();
        var client = _factory.CreateAuthenticatedClient();

        var response = await client.PostAsJsonAsync("/api/v1/distribuicao/ownership-snapshot", new
        {
            obraIds = new[] { missingObraId },
            fonogramaIds = Array.Empty<Guid>()
        });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Status.Should().Be((int)HttpStatusCode.UnprocessableEntity);
        problem.Detail.Should().Contain(missingObraId.ToString());
    }

    private async Task<SeededOwnership> SeedOwnershipAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CadastroDbContext>();
        var associacao = await db.Associacoes.FirstAsync();
        var obra = ObraMusical.Criar($"Obra Snapshot {Guid.NewGuid():N}", TipoObra.Musical);
        var autor = Titular.CriarPessoaFisica("Autor Snapshot", Cpf.Create(GenerateValidCpf()), "BR", associacao.Id);
        var interprete = Titular.CriarPessoaFisica("Interprete Snapshot", Cpf.Create(GenerateValidCpf()), "BR", associacao.Id);
        var fonograma = Fonograma.Criar(CreateIsrc(), obra.Id, "BR");
        var titularidade = TitularidadeAutoral.Criar(obra.Id, autor.Id, CategoriaAutoral.Autor, 100m);
        var participacao = ParticipacaoConexa.Criar(fonograma.Id, interprete.Id, CategoriaConexo.Interprete);
        participacao.DefinirPercentual(100m);

        db.AddRange(obra, autor, interprete, fonograma, titularidade, participacao);
        await db.SaveChangesAsync();

        return new SeededOwnership(
            obra.Id,
            fonograma.Id,
            autor.Id,
            interprete.Id,
            associacao.Sigla);
    }

    private static Isrc CreateIsrc()
    {
        return Isrc.Create($"BRABC24{Random.Shared.Next(10000, 99999)}");
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
        var secondVerifier = secondVerifierSum % 11 < 2 ? 0 : 11 - secondVerifierSum % 11;
        return $"{string.Join(string.Empty, digits)}{firstVerifier}{secondVerifier}";
    }

    private record SeededOwnership(
        Guid ObraId,
        Guid FonogramaId,
        Guid AutorId,
        Guid InterpreteId,
        string AssociacaoSigla);
}
