using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Infra.Data;
using Identificacao.Infra.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Tests.Infra;

public class ExecucaoRepositoryTests : IDisposable
{
    private readonly IdentificacaoDbContext _context;
    private readonly ExecucaoRepository _repository;

    public ExecucaoRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<IdentificacaoDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _context = new IdentificacaoDbContext(options);
        _repository = new ExecucaoRepository(_context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task ListarImpactoPendentesAsync_DeveAgruparCorretamentePorISRCeISWC()
    {
        // Arrange
        var captacao1Id = Guid.NewGuid();
        var captacao2Id = Guid.NewGuid();

        var execucao1 = Execucao.Criar(captacao1Id, Guid.NewGuid(), null, "Obra 1", "BRUM99", null, "", new TimeOnly(0, 0), new TimeOnly(0, 1), 1, null, null, StatusExecucao.Pendente);
        var execucao2 = Execucao.Criar(captacao2Id, Guid.NewGuid(), null, "Obra 1 dif", "BRUM99", null, "", new TimeOnly(0, 0), new TimeOnly(0, 1), 1, null, null, StatusExecucao.Pendente);
        
        var execucao3 = Execucao.Criar(captacao1Id, Guid.NewGuid(), null, "Obra 2", null, "T123", "", new TimeOnly(0, 0), new TimeOnly(0, 1), 1, null, null, StatusExecucao.Pendente);
        
        var execucao4 = Execucao.Criar(captacao2Id, Guid.NewGuid(), null, "Obra 3", null, null, "", new TimeOnly(0, 0), new TimeOnly(0, 1), 1, null, null, StatusExecucao.Pendente);

        _context.Execucoes.AddRange(execucao1, execucao2, execucao3, execucao4);
        await _context.SaveChangesAsync();

        // Act
        var result = await _repository.ListarImpactoPendentesAsync(null, null, null, null, null, "", 1, 10, CancellationToken.None);

        // Assert
        result.Total.Should().Be(3); // BRUM99, T123, e desconhecido
        var items = result.Items.ToList();
        
        var isrcGroup = items.Single(i => i.Tipo == "isrc" && i.Identificador == "BRUM99");
        isrcGroup.QuantidadeExecucoes.Should().Be(2);
        isrcGroup.CaptacoesAfetadas.Should().Be(2);

        var iswcGroup = items.Single(i => i.Tipo == "iswc" && i.Identificador == "T123");
        iswcGroup.QuantidadeExecucoes.Should().Be(1);
        iswcGroup.CaptacoesAfetadas.Should().Be(1);

        var descGroup = items.Single(i => i.Tipo == "desconhecido");
        descGroup.QuantidadeExecucoes.Should().Be(1);
        descGroup.CaptacoesAfetadas.Should().Be(1);
    }
}
