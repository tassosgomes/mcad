using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Filters;
using Identificacao.IntegrationTests.Fixtures;
using Identificacao.Infra.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.IntegrationTests.Repositories;

[Collection(PostgresCollection.Name)]
public class CaptacaoRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public CaptacaoRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    private static Rubrica CriarRubrica(string sigla = "RADIO", bool exigeClassificacao = false) =>
        Rubrica.Criar(Guid.NewGuid(), sigla, $"Rubrica {sigla}", exigeClassificacao);

    private static Captacao CriarCaptacao(Guid rubricaId, DateOnly periodo, Guid? analistaId = null) =>
        Captacao.Criar(rubricaId, periodo, Guid.NewGuid(), "User Música", analistaId ?? Guid.NewGuid(), "Analista");

    [Fact]
    public async Task GetByIdAsync_QuandoExiste_RetornaComRubricaIncluida()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id, new DateOnly(2026, 1, 1));

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        var found = await repo.GetByIdAsync(captacao.Id, default);

        found.Should().NotBeNull();
        found!.Id.Should().Be(captacao.Id);
        found.Rubrica.Should().NotBeNull();
        found.Rubrica!.Sigla.Should().Be("RADIO");
    }

    [Fact]
    public async Task GetByIdAsync_QuandoNaoExiste_RetornaNull()
    {
        await _fixture.ResetAsync();
        await using var ctx = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctx);

        var found = await repo.GetByIdAsync(Guid.NewGuid(), default);

        found.Should().BeNull();
    }

    [Fact]
    public async Task ExisteAtivaParaRubricaPeriodoAsync_ComCaptacaoAberta_RetornaTrue()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var periodo = new DateOnly(2026, 2, 1);
        var captacao = CriarCaptacao(rubrica.Id, periodo);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        var existe = await repo.ExisteAtivaParaRubricaPeriodoAsync(rubrica.Id, periodo, excluirId: null, default);

        existe.Should().BeTrue();
    }

    [Fact]
    public async Task ExisteAtivaParaRubricaPeriodoAsync_QuandoCaptacaoFoiCancelada_RetornaFalse()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var periodo = new DateOnly(2026, 3, 1);
        var captacao = CriarCaptacao(rubrica.Id, periodo);
        captacao.Fechar();
        captacao.Cancelar("Motivo qualquer");

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        var existe = await repo.ExisteAtivaParaRubricaPeriodoAsync(rubrica.Id, periodo, excluirId: null, default);

        existe.Should().BeFalse();
    }

    [Fact]
    public async Task ExisteAtivaParaRubricaPeriodoAsync_ComExcluirId_IgnoraOIdInformado()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var periodo = new DateOnly(2026, 4, 1);
        var captacao = CriarCaptacao(rubrica.Id, periodo);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        // Excluindo o próprio Id da busca: deve retornar false (não há outra captação ativa).
        var existe = await repo.ExisteAtivaParaRubricaPeriodoAsync(rubrica.Id, periodo, excluirId: captacao.Id, default);

        existe.Should().BeFalse();
    }

    [Fact]
    public async Task UniqueIndex_RubricaPeriodo_PermiteDuasCaptacoesSeUmaForCancelada()
    {
        // Valida o índice único parcial: HasFilter("\"Status\" != 'Cancelada'")
        // Cancelada não conta para a constraint → permite recriar captação após cancelar.
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var periodo = new DateOnly(2026, 5, 1);
        var cancelada = CriarCaptacao(rubrica.Id, periodo);
        cancelada.Fechar();
        cancelada.Cancelar("Motivo qualquer");

        var nova = CriarCaptacao(rubrica.Id, periodo);

        await using var ctx = _fixture.CreateDbContext();
        ctx.Rubricas.Add(rubrica);
        ctx.Captacoes.Add(cancelada);
        ctx.Captacoes.Add(nova);

        Func<Task> act = () => ctx.SaveChangesAsync();
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task UniqueIndex_RubricaPeriodo_RejeitaDuasCaptacoesAtivasMesmaCombinacao()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var periodo = new DateOnly(2026, 6, 1);
        var c1 = CriarCaptacao(rubrica.Id, periodo);
        var c2 = CriarCaptacao(rubrica.Id, periodo);

        await using var ctx = _fixture.CreateDbContext();
        ctx.Rubricas.Add(rubrica);
        ctx.Captacoes.Add(c1);
        ctx.Captacoes.Add(c2);

        Func<Task> act = () => ctx.SaveChangesAsync();
        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task ContarExecucoesAsync_RetornaContagemPorCaptacao()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id, new DateOnly(2026, 7, 1));

        var execs = new[]
        {
            Execucao.Criar(captacao.Id, Guid.NewGuid(), null, "Obra A", null, null, "", new TimeOnly(1, 0), new TimeOnly(1, 5), 1, null, null, StatusExecucao.Identificada),
            Execucao.Criar(captacao.Id, Guid.NewGuid(), null, "Obra B", null, null, "", new TimeOnly(2, 0), new TimeOnly(2, 5), 1, null, null, StatusExecucao.Pendente),
            Execucao.Criar(captacao.Id, Guid.NewGuid(), null, "Obra C", null, null, "", new TimeOnly(3, 0), new TimeOnly(3, 5), 1, null, null, StatusExecucao.Identificada),
        };

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Execucoes.AddRange(execs);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        var total = await repo.ContarExecucoesAsync(captacao.Id, default);

        total.Should().Be(3);
    }

    [Fact]
    public async Task ListarAsync_FiltrosCombinados_RetornaApenasMatches()
    {
        await _fixture.ResetAsync();
        var rubricaA = CriarRubrica("TV");
        var rubricaB = CriarRubrica("RADIO");
        var analistaAlvo = Guid.NewGuid();

        var captacoes = new[]
        {
            CriarCaptacao(rubricaA.Id, new DateOnly(2026, 1, 1), analistaAlvo),
            CriarCaptacao(rubricaA.Id, new DateOnly(2026, 2, 1), analistaAlvo),
            CriarCaptacao(rubricaA.Id, new DateOnly(2026, 3, 1), Guid.NewGuid()),   // analista diferente
            CriarCaptacao(rubricaB.Id, new DateOnly(2026, 2, 1), analistaAlvo),     // rubrica diferente
        };

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.AddRange(rubricaA, rubricaB);
            ctx.Captacoes.AddRange(captacoes);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        var filtro = new ListarCaptacoesFiltro(
            RubricaId: rubricaA.Id,
            PeriodoInicio: new DateOnly(2026, 1, 1),
            PeriodoFim: new DateOnly(2026, 2, 28),
            AnalistaResponsavelId: analistaAlvo,
            Sort: "periodo",
            Page: 1,
            Size: 10);

        var (items, total) = await repo.ListarAsync(filtro, default);

        total.Should().Be(2);
        items.Should().HaveCount(2);
        items.Select(c => c.Periodo).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task ListarAsync_OrdenacaoPorRubrica_OrdenaPeloNomeDaRubrica()
    {
        await _fixture.ResetAsync();
        var rubricaZ = Rubrica.Criar(Guid.NewGuid(), "Z", "Zebra", false);
        var rubricaA = Rubrica.Criar(Guid.NewGuid(), "A", "Alfa", false);
        var cZ = CriarCaptacao(rubricaZ.Id, new DateOnly(2026, 1, 1));
        var cA = CriarCaptacao(rubricaA.Id, new DateOnly(2026, 1, 1));

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.AddRange(rubricaZ, rubricaA);
            ctx.Captacoes.AddRange(cZ, cA);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        var filtro = new ListarCaptacoesFiltro(Sort: "rubrica", Page: 1, Size: 10);
        var (items, _) = await repo.ListarAsync(filtro, default);

        items.Select(c => c.Rubrica!.Nome).Should().Equal("Alfa", "Zebra");
    }

    [Fact]
    public async Task ListarAsync_Paginacao_RespeitaPageSize()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacoes = Enumerable.Range(1, 15)
            .Select(i => CriarCaptacao(rubrica.Id, new DateOnly(2024 + (i / 12), ((i - 1) % 12) + 1, 1)))
            .ToArray();

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.AddRange(captacoes);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        var (items, total) = await repo.ListarAsync(
            new ListarCaptacoesFiltro(Sort: "periodo", Page: 2, Size: 5), default);

        total.Should().Be(15);
        items.Should().HaveCount(5);
    }

    [Fact]
    public async Task ListarAsync_FiltroStatusCancelada_RetornaApenasCanceladas()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var aberta = CriarCaptacao(rubrica.Id, new DateOnly(2026, 1, 1));
        var fechadaCancelada = CriarCaptacao(rubrica.Id, new DateOnly(2026, 2, 1));
        fechadaCancelada.Fechar();
        fechadaCancelada.Cancelar("X");

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.AddRange(aberta, fechadaCancelada);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new CaptacaoRepository(ctxRead);

        var (items, total) = await repo.ListarAsync(
            new ListarCaptacoesFiltro(Status: "Cancelada", Sort: "periodo", Page: 1, Size: 10), default);

        total.Should().Be(1);
        items.Single().Id.Should().Be(fechadaCancelada.Id);
    }
}
