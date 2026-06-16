using FluentAssertions;
using Identificacao.Domain.Identidade;
using Identificacao.Infra.Data;
using Identificacao.Infra.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Tests.Infra;

public class UsuarioIdentidadeRepositoryTests : IDisposable
{
    private readonly IdentificacaoDbContext _context;
    private readonly UsuarioIdentidadeRepository _repository;

    public UsuarioIdentidadeRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<IdentificacaoDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new IdentificacaoDbContext(options);
        _repository = new UsuarioIdentidadeRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task ListarAtivosAsync_ExcluiUsuariosSuspensos()
    {
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = "Ativo",
            IsSuspended = false
        });
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade
        {
            LogtoUserId = "sub-02",
            DisplayName = "Suspenso",
            IsSuspended = true
        });
        await _context.SaveChangesAsync();

        var result = await _repository.ListarAtivosAsync(default);

        result.Should().HaveCount(1);
        result[0].LogtoUserId.Should().Be("sub-01");
    }

    [Fact]
    public async Task ListarAtivosAsync_ExcluiUsuariosExcluidos()
    {
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = "Ativo",
            IsSuspended = false,
            DeletedAtUtc = null
        });
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade
        {
            LogtoUserId = "sub-02",
            DisplayName = "Excluído",
            IsSuspended = false,
            DeletedAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var result = await _repository.ListarAtivosAsync(default);

        result.Should().HaveCount(1);
        result[0].LogtoUserId.Should().Be("sub-01");
    }

    [Fact]
    public async Task ListarAtivosAsync_ExcluiSuspensoEDeletado()
    {
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade
        {
            LogtoUserId = "sub-01",
            DisplayName = "Ativo",
            IsSuspended = false,
            DeletedAtUtc = null
        });
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade
        {
            LogtoUserId = "sub-02",
            DisplayName = "Suspenso e Deletado",
            IsSuspended = true,
            DeletedAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var result = await _repository.ListarAtivosAsync(default);

        result.Should().HaveCount(1);
        result[0].LogtoUserId.Should().Be("sub-01");
    }

    [Fact]
    public async Task ListarTodosAsync_IncluiUsuariosSuspensos()
    {
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-01", DisplayName = "Ativo", IsSuspended = false });
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-02", DisplayName = "Suspenso", IsSuspended = true });
        await _context.SaveChangesAsync();

        var result = await _repository.ListarTodosAsync(default);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListarTodosAsync_IncluiUsuariosExcluidos()
    {
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-01", DisplayName = "Ativo", DeletedAtUtc = null });
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade
        {
            LogtoUserId = "sub-02",
            DisplayName = "Excluído",
            DeletedAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var result = await _repository.ListarTodosAsync(default);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task BuscarPorSubjectAsync_EncontraPorLogtoUserId()
    {
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-01", DisplayName = "João" });
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-02", DisplayName = "Maria" });
        await _context.SaveChangesAsync();

        var result = await _repository.BuscarPorSubjectAsync("sub-01", default);

        result.Should().NotBeNull();
        result!.DisplayName.Should().Be("João");
    }

    [Fact]
    public async Task BuscarPorSubjectAsync_UsuarioNaoEncontrado_RetornaNull()
    {
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-01", DisplayName = "João" });
        await _context.SaveChangesAsync();

        var result = await _repository.BuscarPorSubjectAsync("inexistente", default);

        result.Should().BeNull();
    }

    [Fact]
    public async Task ListarAtivosAsync_OrdenaPorDisplayName()
    {
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-03", DisplayName = "Carlos", IsSuspended = false });
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-01", DisplayName = "Ana", IsSuspended = false });
        _context.UsuariosIdentidade.Add(new UsuarioIdentidade { LogtoUserId = "sub-02", DisplayName = "Bruno", IsSuspended = false });
        await _context.SaveChangesAsync();

        var result = await _repository.ListarAtivosAsync(default);

        result.Should().HaveCount(3);
        result[0].DisplayName.Should().Be("Ana");
        result[1].DisplayName.Should().Be("Bruno");
        result[2].DisplayName.Should().Be("Carlos");
    }
}
