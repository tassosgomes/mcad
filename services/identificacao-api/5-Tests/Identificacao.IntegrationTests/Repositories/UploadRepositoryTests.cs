using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.IntegrationTests.Fixtures;
using Identificacao.Infra.Repositories;

namespace Identificacao.IntegrationTests.Repositories;

[Collection(PostgresCollection.Name)]
public class UploadRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public UploadRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    private static Rubrica CriarRubrica() =>
        Rubrica.Criar(Guid.NewGuid(), "RADIO", "Rubrica Teste", false);

    private static Captacao CriarCaptacao(Guid rubricaId) =>
        Captacao.Criar(rubricaId, new DateOnly(2026, 1, 1), "User", Guid.NewGuid(), "Analista");

    [Fact]
    public async Task GetByIdAsync_QuandoExiste_RetornaUpload()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);
        var upload = Upload.Criar(captacao.Id, "arquivo.csv", "uploads/x/y/arquivo.csv", captacao.AnalistaResponsavelId);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Uploads.Add(upload);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new UploadRepository(ctxRead);

        var found = await repo.GetByIdAsync(captacao.Id, upload.Id, default);

        found.Should().NotBeNull();
        found!.NomeArquivo.Should().Be("arquivo.csv");
        found.Status.Should().Be(StatusUpload.Processando);
    }

    [Fact]
    public async Task GetByIdAsync_CaptacaoIdDivergente_RetornaNull()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);
        var upload = Upload.Criar(captacao.Id, "arquivo.csv", "key", captacao.AnalistaResponsavelId);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Uploads.Add(upload);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new UploadRepository(ctxRead);

        var found = await repo.GetByIdAsync(Guid.NewGuid(), upload.Id, default);

        found.Should().BeNull();
    }

    [Fact]
    public async Task ListarAsync_OrdenaPorCriadoEmDescendente_ERespeitaPaginacao()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            // Cria 5 uploads com pequenas diferenças temporais (criadoEm via DateTime.UtcNow no factory).
            for (int i = 0; i < 5; i++)
            {
                ctx.Uploads.Add(Upload.Criar(captacao.Id, $"a{i}.csv", $"k{i}", captacao.AnalistaResponsavelId));
                await ctx.SaveChangesAsync();
                await Task.Delay(5);
            }
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new UploadRepository(ctxRead);

        var (items, total) = await repo.ListarAsync(captacao.Id, 1, 3, default);

        total.Should().Be(5);
        items.Should().HaveCount(3);
        items.Should().BeInDescendingOrder(u => u.CriadoEm);
    }

    [Fact]
    public async Task ListarPendentesAsync_RetornaApenasUploadsProcessando_OrdenadosFIFO()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);

        var u1 = Upload.Criar(captacao.Id, "a.csv", "k1", captacao.AnalistaResponsavelId);
        var u2 = Upload.Criar(captacao.Id, "b.csv", "k2", captacao.AnalistaResponsavelId);
        u2.MarcarConcluido(10, 10, 0); // sai do estado Processando
        var u3 = Upload.Criar(captacao.Id, "c.csv", "k3", captacao.AnalistaResponsavelId);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Uploads.AddRange(u1, u2, u3);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new UploadRepository(ctxRead);

        var pendentes = (await repo.ListarPendentesAsync(default)).ToList();

        pendentes.Should().HaveCount(2);
        pendentes.Select(u => u.Id).Should().Equal(u1.Id, u3.Id); // ordem FIFO por CriadoEm
        pendentes[0].Captacao.Should().NotBeNull();
        pendentes[0].Captacao.Rubrica.Should().NotBeNull();
    }
}

[Collection(PostgresCollection.Name)]
public class ErroUploadRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public ErroUploadRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task ListarPorUploadAsync_OrdenaPorLinhaAscendente_ERespeitaPaginacao()
    {
        await _fixture.ResetAsync();
        var rubrica = Rubrica.Criar(Guid.NewGuid(), "R", "Rubrica", false);
        var captacao = Captacao.Criar(rubrica.Id, new DateOnly(2026, 1, 1), "U", Guid.NewGuid(), "A");
        var upload = Upload.Criar(captacao.Id, "arq.csv", "k", captacao.AnalistaResponsavelId);

        var erros = new[]
        {
            ErroUpload.Criar(upload.Id, 5, "isrc", "Faltando"),
            ErroUpload.Criar(upload.Id, 2, "fim", "Inválido"),
            ErroUpload.Criar(upload.Id, 8, "tipo_utilizacao", "Desconhecido"),
        };

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Uploads.Add(upload);
            ctx.ErrosUpload.AddRange(erros);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new ErroUploadRepository(ctxRead);

        var (items, total) = await repo.ListarPorUploadAsync(upload.Id, page: 1, size: 2, default);

        total.Should().Be(3);
        items.Select(e => e.Linha).Should().Equal(2, 5); // primeiros 2 ordenados por linha ascendente
    }

    [Fact]
    public async Task ListarPorUploadAsync_FiltraPorUploadCorreto_IgnoraOutros()
    {
        await _fixture.ResetAsync();
        var rubrica = Rubrica.Criar(Guid.NewGuid(), "R", "Rubrica", false);
        var captacao = Captacao.Criar(rubrica.Id, new DateOnly(2026, 1, 1), "U", Guid.NewGuid(), "A");
        var uploadA = Upload.Criar(captacao.Id, "A.csv", "kA", captacao.AnalistaResponsavelId);
        var uploadB = Upload.Criar(captacao.Id, "B.csv", "kB", captacao.AnalistaResponsavelId);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Uploads.AddRange(uploadA, uploadB);
            ctx.ErrosUpload.Add(ErroUpload.Criar(uploadA.Id, 1, "x", "errA"));
            ctx.ErrosUpload.Add(ErroUpload.Criar(uploadB.Id, 1, "x", "errB"));
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new ErroUploadRepository(ctxRead);

        var (items, total) = await repo.ListarPorUploadAsync(uploadA.Id, 1, 10, default);

        total.Should().Be(1);
        items.Single().Mensagem.Should().Be("errA");
    }
}
