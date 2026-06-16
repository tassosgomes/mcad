using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.IntegrationTests.Fixtures;
using Identificacao.Infra.Repositories;

namespace Identificacao.IntegrationTests.Repositories;

[Collection(PostgresCollection.Name)]
public class UsuarioMusicaSnapshotRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public UsuarioMusicaSnapshotRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task UpsertAsync_NovoRegistro_CriaSnapshot()
    {
        await _fixture.ResetAsync();
        var id = Guid.NewGuid();
        var snapshot = UsuarioMusicaSnapshot.Criar(id, "Radio Globo", "12345678000190", "ATIVO", DateTime.UtcNow);

        await using var ctx = _fixture.CreateDbContext();
        var repo = new UsuarioMusicaSnapshotRepository(ctx);
        await repo.UpsertAsync(snapshot, CancellationToken.None);
        await repo.SaveChangesAsync(CancellationToken.None);

        await using var ctxRead = _fixture.CreateDbContext();
        var found = await ctxRead.UsuariosMusicaSnapshot.FindAsync(id);
        found.Should().NotBeNull();
        found!.RazaoSocial.Should().Be("Radio Globo");
        found.Cnpj.Should().Be("12345678000190");
        found.Status.Should().Be("ATIVO");
    }

    [Fact]
    public async Task UpsertAsync_RegistroExistente_AtualizaSnapshot()
    {
        await _fixture.ResetAsync();
        var id = Guid.NewGuid();
        var original = UsuarioMusicaSnapshot.Criar(id, "Radio Globo", "12345678000190", "ATIVO", DateTime.UtcNow.AddHours(-1));

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.UsuariosMusicaSnapshot.Add(original);
            await ctx.SaveChangesAsync();
        }

        var updated = UsuarioMusicaSnapshot.Criar(id, "Radio Globo Atualizada", "12345678000190", "INATIVO", DateTime.UtcNow);

        await using (var ctx = _fixture.CreateDbContext())
        {
            var repo = new UsuarioMusicaSnapshotRepository(ctx);
            await repo.UpsertAsync(updated, CancellationToken.None);
            await repo.SaveChangesAsync(CancellationToken.None);
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var found = await ctxRead.UsuariosMusicaSnapshot.FindAsync(id);
        found.Should().NotBeNull();
        found!.RazaoSocial.Should().Be("Radio Globo Atualizada");
        found.Status.Should().Be("INATIVO");
    }

    [Fact]
    public async Task GetByIdAsync_RegistroNaoExiste_RetornaNull()
    {
        await _fixture.ResetAsync();

        await using var ctx = _fixture.CreateDbContext();
        var repo = new UsuarioMusicaSnapshotRepository(ctx);

        var result = await repo.GetByIdAsync(Guid.NewGuid(), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_RegistroExiste_RetornaSnapshot()
    {
        await _fixture.ResetAsync();
        var id = Guid.NewGuid();
        var snapshot = UsuarioMusicaSnapshot.Criar(id, "Radio Globo", "12345678000190", "ATIVO", DateTime.UtcNow);

        await using (var ctx = _fixture.CreateDbContext())
        {
            ctx.UsuariosMusicaSnapshot.Add(snapshot);
            await ctx.SaveChangesAsync();
        }

        await using var ctxRead = _fixture.CreateDbContext();
        var repo = new UsuarioMusicaSnapshotRepository(ctxRead);
        var result = await repo.GetByIdAsync(id, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(id);
        result.RazaoSocial.Should().Be("Radio Globo");
    }
}
