using Cadastro.Domain.Entities;
using Cadastro.Infra.Data.Configurations;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Data;

/// <summary>
/// DbContext do domínio Cadastro — isolado no schema PostgreSQL "cadastro".
/// Aplica todas as configurações via Fluent API (nenhum atributo de anotação).
/// </summary>
public class CadastroDbContext : DbContext
{
    public DbSet<Associacao> Associacoes => Set<Associacao>();
    public DbSet<Titular> Titulares => Set<Titular>();
    public DbSet<ObraMusical> ObrasMusicais => Set<ObraMusical>();
    public DbSet<TitularidadeAutoral> TitularidadesAutorais => Set<TitularidadeAutoral>();
    public DbSet<Fonograma> Fonogramas => Set<Fonograma>();

    public CadastroDbContext(DbContextOptions<CadastroDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Schema isolado para o domínio Cadastro (Schema-per-Service)
        modelBuilder.HasDefaultSchema("cadastro");

        // Aplicar configurações via Fluent API
        modelBuilder.ApplyConfiguration(new AssociacaoConfiguration());
        modelBuilder.ApplyConfiguration(new TitularConfiguration());
        modelBuilder.ApplyConfiguration(new ObraMusicalConfiguration());
        modelBuilder.ApplyConfiguration(new TitularidadeAutoralConfiguration());
        modelBuilder.ApplyConfiguration(new FonogramaConfiguration());

        base.OnModelCreating(modelBuilder);
    }
}
