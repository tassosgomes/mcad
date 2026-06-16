using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Infra.Data;
using Identificacao.Infra.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Tests.Infra;

public class UsuarioMusicaSnapshotRepositoryTests : IDisposable
{
    private readonly IdentificacaoDbContext _context;
    private readonly UsuarioMusicaSnapshotRepository _repository;

    public UsuarioMusicaSnapshotRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<IdentificacaoDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new IdentificacaoDbContext(options);
        _repository = new UsuarioMusicaSnapshotRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetByIdAsync_NotFound_ReturnsNull()
    {
        var result = await _repository.GetByIdAsync(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_Found_ReturnsEntity()
    {
        var id = Guid.NewGuid();
        var snapshot = UsuarioMusicaSnapshot.Criar(id, "Radio Globo", "12345678000190", "ATIVO", DateTime.UtcNow);
        _context.UsuariosMusicaSnapshot.Add(snapshot);
        await _context.SaveChangesAsync();

        var result = await _repository.GetByIdAsync(id, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(id);
        result.RazaoSocial.Should().Be("Radio Globo");
    }

    [Fact]
    public async Task UpsertAsync_NewEntity_CreatesRecord()
    {
        var id = Guid.NewGuid();
        var snapshot = UsuarioMusicaSnapshot.Criar(id, "Radio Globo", "12345678000190", "ATIVO", DateTime.UtcNow);

        await _repository.UpsertAsync(snapshot, CancellationToken.None);
        await _repository.SaveChangesAsync(CancellationToken.None);

        var result = await _repository.GetByIdAsync(id, CancellationToken.None);
        result.Should().NotBeNull();
        result!.RazaoSocial.Should().Be("Radio Globo");
    }

    [Fact]
    public async Task UpsertAsync_ExistingEntity_UpdatesRecord()
    {
        var id = Guid.NewGuid();
        var original = UsuarioMusicaSnapshot.Criar(id, "Radio Globo", "12345678000190", "ATIVO", DateTime.UtcNow.AddHours(-1));
        _context.UsuariosMusicaSnapshot.Add(original);
        await _context.SaveChangesAsync();

        var updated = UsuarioMusicaSnapshot.Criar(id, "Radio Globo Atualizada", "12345678000190", "INATIVO", DateTime.UtcNow);

        await _repository.UpsertAsync(updated, CancellationToken.None);
        await _repository.SaveChangesAsync(CancellationToken.None);

        var result = await _repository.GetByIdAsync(id, CancellationToken.None);
        result.Should().NotBeNull();
        result!.RazaoSocial.Should().Be("Radio Globo Atualizada");
        result.Status.Should().Be("INATIVO");
    }
}
