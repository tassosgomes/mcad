using Identificacao.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Data;

public class IdentificacaoDbContext : DbContext
{
    public IdentificacaoDbContext(DbContextOptions<IdentificacaoDbContext> options) : base(options)
    {
    }

    public DbSet<Captacao> Captacoes => Set<Captacao>();
    public DbSet<Rubrica> Rubricas => Set<Rubrica>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("identificacao");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IdentificacaoDbContext).Assembly);
    }
}
