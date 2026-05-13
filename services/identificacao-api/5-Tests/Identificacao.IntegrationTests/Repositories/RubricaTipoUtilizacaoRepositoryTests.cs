using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.IntegrationTests.Fixtures;
using Identificacao.Infra.Repositories;

namespace Identificacao.IntegrationTests.Repositories;

[Collection(PostgresCollection.Name)]
public class RubricaRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public RubricaRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task GetAllAsync_RetornaTodasAsRubricas()
    {
        await _fixture.ResetAsync();
        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.Rubricas.AddRange(
                Rubrica.Criar(Guid.NewGuid(), "TV", "TV Aberta", true),
                Rubrica.Criar(Guid.NewGuid(), "RADIO", "Rádio", false),
                Rubrica.Criar(Guid.NewGuid(), "DIG", "Digital", false));
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new RubricaRepository(ctxRead);

        var rubricas = (await repo.GetAllAsync(default)).ToList();

        rubricas.Should().HaveCount(3);
        rubricas.Should().Contain(r => r.Sigla == "TV" && r.ExigeClassificacao);
        rubricas.Should().Contain(r => r.Sigla == "RADIO" && !r.ExigeClassificacao);
    }

    [Fact]
    public async Task GetAllAsync_SemRubricasCadastradas_RetornaListaVazia()
    {
        await _fixture.ResetAsync();
        await using var ctx = _fixture.CreateDbContext();
        var repo = new RubricaRepository(ctx);

        var result = await repo.GetAllAsync(default);

        result.Should().BeEmpty();
    }
}

[Collection(PostgresCollection.Name)]
public class TipoUtilizacaoRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public TipoUtilizacaoRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task ListarAsync_RetornaOrdenadoPorDescricaoAscendente()
    {
        await _fixture.ResetAsync();
        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.TiposUtilizacao.AddRange(
                TipoUtilizacao.Criar(Guid.NewGuid(), "TE", "Tema", 100),
                TipoUtilizacao.Criar(Guid.NewGuid(), "BK", "Background", 50),
                TipoUtilizacao.Criar(Guid.NewGuid(), "PE", "Performance", 80));
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new TipoUtilizacaoRepository(ctxRead);

        var tipos = (await repo.ListarAsync(default)).ToList();

        tipos.Select(t => t.Descricao).Should().Equal("Background", "Performance", "Tema");
    }

    [Fact]
    public async Task GetByIdAsync_QuandoExiste_RetornaTipo()
    {
        await _fixture.ResetAsync();
        var tipo = TipoUtilizacao.Criar(Guid.NewGuid(), "TA", "Trilha Adicional", 100);
        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.TiposUtilizacao.Add(tipo);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new TipoUtilizacaoRepository(ctxRead);

        var found = await repo.GetByIdAsync(tipo.Id, default);

        found.Should().NotBeNull();
        found!.Sigla.Should().Be("TA");
        found.Peso.Should().Be(100m);
    }

    [Fact]
    public async Task GetByIdAsync_QuandoNaoExiste_RetornaNull()
    {
        await _fixture.ResetAsync();
        await using var ctx = _fixture.CreateDbContext();
        var repo = new TipoUtilizacaoRepository(ctx);

        var found = await repo.GetByIdAsync(Guid.NewGuid(), default);

        found.Should().BeNull();
    }
}
