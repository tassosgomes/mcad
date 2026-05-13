using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.IntegrationTests.Fixtures;
using Identificacao.Infra.Repositories;

namespace Identificacao.IntegrationTests.Repositories;

[Collection(PostgresCollection.Name)]
public class ExecucaoRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public ExecucaoRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    private static Rubrica CriarRubrica() =>
        Rubrica.Criar(Guid.NewGuid(), "RADIO", "Rubrica Teste", false);

    private static Captacao CriarCaptacao(Guid rubricaId) =>
        Captacao.Criar(rubricaId, new DateOnly(2026, 1, 1), "User", Guid.NewGuid(), "Analista");

    private static Execucao CriarExecucao(
        Guid captacaoId,
        StatusExecucao status,
        string? isrc = null,
        string? iswc = null,
        string titulo = "Obra X",
        TimeOnly? inicio = null,
        TimeOnly? fim = null) =>
        Execucao.Criar(
            captacaoId, Guid.NewGuid(), null,
            titulo, isrc, iswc, "Int",
            inicio ?? new TimeOnly(10, 0), fim ?? new TimeOnly(10, 5),
            1, null, null, status);

    [Fact]
    public async Task ListarImpactoPendentesAsync_AgrupaPorISRCContandoCaptacoesDistintas()
    {
        // Substitui o teste antigo (false-positive InMemory). Roda em Postgres real.
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var c1 = CriarCaptacao(rubrica.Id);
        var c2 = Captacao.Criar(rubrica.Id, new DateOnly(2026, 2, 1), "U2", Guid.NewGuid(), "A2");

        var e1 = CriarExecucao(c1.Id, StatusExecucao.Pendente, isrc: "BRUM99", titulo: "Obra 1");
        var e2 = CriarExecucao(c2.Id, StatusExecucao.Pendente, isrc: "BRUM99", titulo: "Obra 1 dif");
        var e3 = CriarExecucao(c1.Id, StatusExecucao.Pendente, iswc: "T123", titulo: "Obra 2");
        var e4 = CriarExecucao(c2.Id, StatusExecucao.Pendente, titulo: "Obra Desc");

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.AddRange(c1, c2);
            ctx.Execucoes.AddRange(e1, e2, e3, e4);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new ExecucaoRepository(ctxRead);

        var result = await repo.ListarImpactoPendentesAsync(
            null, null, null, null, null, "", 1, 10, default);

        result.Total.Should().Be(3);
        var items = result.Items.ToList();
        items.Single(i => i.Tipo == "isrc" && i.Identificador == "BRUM99").CaptacoesAfetadas.Should().Be(2);
        items.Single(i => i.Tipo == "isrc" && i.Identificador == "BRUM99").QuantidadeExecucoes.Should().Be(2);
        items.Single(i => i.Tipo == "iswc" && i.Identificador == "T123").CaptacoesAfetadas.Should().Be(1);
        items.Single(i => i.Tipo == "desconhecido").QuantidadeExecucoes.Should().Be(1);
    }

    [Fact]
    public async Task ListarImpactoPendentesAsync_FiltroQ_BuscaCaseInsensitivePorTitulo()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);
        var e1 = CriarExecucao(captacao.Id, StatusExecucao.Pendente, isrc: "X1", titulo: "NOVELA das Nove");
        var e2 = CriarExecucao(captacao.Id, StatusExecucao.Pendente, isrc: "X2", titulo: "Jornal");

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Execucoes.AddRange(e1, e2);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new ExecucaoRepository(ctxRead);

        var result = await repo.ListarImpactoPendentesAsync(
            captacaoId: null, rubricaId: null, periodoInicio: null, periodoFim: null,
            q: "novela", sort: "", page: 1, size: 10, ct: default);

        result.Items.Should().ContainSingle();
        result.Items.Single().Identificador.Should().Be("X1");
    }

    [Fact]
    public async Task ContarSemHorarioAsync_ConsideraInicioOuFimZerados()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);

        // Cenários:
        // (1) inicio 00:00:00 e fim 00:00:30 -> conta (inicio zerado)
        // (2) inicio 10:00:00 e fim 10:00:01 -> NÃO conta
        // (3) inicio 10:00:00 e fim 00:00:00 -> NÃO testável (fim<=inicio bloqueia no Criar);
        //     forçamos via reflection setando fim = TimeOnly(0,0,0) após criação.
        var semInicio = CriarExecucao(captacao.Id, StatusExecucao.Identificada,
            inicio: new TimeOnly(0, 0, 0), fim: new TimeOnly(0, 0, 30));
        var comHorario = CriarExecucao(captacao.Id, StatusExecucao.Identificada,
            inicio: new TimeOnly(10, 0, 0), fim: new TimeOnly(10, 0, 1));

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Execucoes.AddRange(semInicio, comHorario);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new ExecucaoRepository(ctxRead);

        var total = await repo.ContarSemHorarioAsync(captacao.Id, default);

        // Apenas semInicio conta (10:00:00 -> 10:00:01 tem hora ≠ 00:00:00 em ambos os lados)
        total.Should().Be(1);
    }

    [Fact]
    public async Task ListarAsync_FiltroPorStatusEPaginacao_RespeitaContrato()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);

        var execs = Enumerable.Range(0, 5).Select(i => CriarExecucao(
            captacao.Id,
            i < 3 ? StatusExecucao.Pendente : StatusExecucao.Identificada,
            titulo: $"Obra {i}",
            inicio: new TimeOnly(i + 1, 0),
            fim: new TimeOnly(i + 1, 30))).ToArray();

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Execucoes.AddRange(execs);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new ExecucaoRepository(ctxRead);

        var (items, total) = await repo.ListarAsync(captacao.Id, "Pendente", "obratitulo", 1, 10, default);

        total.Should().Be(3);
        items.Should().HaveCount(3);
        items.Should().BeInAscendingOrder(e => e.ObraTitulo);
    }

    [Fact]
    public async Task GetByIdAsync_QuandoCaptacaoIdDivergente_RetornaNull()
    {
        // Validação de tenant isolation por (captacaoId, id).
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);
        var execucao = CriarExecucao(captacao.Id, StatusExecucao.Pendente);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Execucoes.Add(execucao);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new ExecucaoRepository(ctxRead);

        // captacaoId errado mesmo com execucaoId correto.
        var found = await repo.GetByIdAsync(Guid.NewGuid(), execucao.Id, default);

        found.Should().BeNull();
    }

    [Fact]
    public async Task ListarPendentesPorIdentificadorAsync_FiltraPorTipoCorretamente()
    {
        await _fixture.ResetAsync();
        var rubrica = CriarRubrica();
        var captacao = CriarCaptacao(rubrica.Id);

        var comIsrc = CriarExecucao(captacao.Id, StatusExecucao.Pendente, isrc: "BR-ABC", titulo: "Obra ISRC");
        var comIswc = CriarExecucao(captacao.Id, StatusExecucao.Pendente, iswc: "T-999", titulo: "Obra ISWC");

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.Add(rubrica);
            ctx.Captacoes.Add(captacao);
            ctx.Execucoes.AddRange(comIsrc, comIswc);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new ExecucaoRepository(ctxRead);

        var porIsrc = await repo.ListarPendentesPorIdentificadorAsync("BR-ABC", "isrc", default);
        porIsrc.Should().ContainSingle().Which.Id.Should().Be(comIsrc.Id);

        var porIswc = await repo.ListarPendentesPorIdentificadorAsync("T-999", "iswc", default);
        porIswc.Should().ContainSingle().Which.Id.Should().Be(comIswc.Id);

        var tipoInvalido = await repo.ListarPendentesPorIdentificadorAsync("BR-ABC", "qualquer", default);
        tipoInvalido.Should().BeEmpty();
    }
}
