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
    public DbSet<Execucao> Execucoes => Set<Execucao>();
    public DbSet<TipoUtilizacao> TiposUtilizacao => Set<TipoUtilizacao>();
    public DbSet<Upload> Uploads => Set<Upload>();
    public DbSet<ErroUpload> ErrosUpload => Set<ErroUpload>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("identificacao");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IdentificacaoDbContext).Assembly);
    }
}
