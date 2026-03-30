using Cadastro.Domain.Entities;
using Cadastro.Infra.Data.Seeds;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

/// <summary>
/// Fluent API configuration para a entidade Associacao.
/// Define mapeamento de tabela, colunas, constraints e seed data.
/// </summary>
public class AssociacaoConfiguration : IEntityTypeConfiguration<Associacao>
{
    public void Configure(EntityTypeBuilder<Associacao> builder)
    {
        builder.ToTable("associacoes");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .IsRequired();

        builder.Property(a => a.Nome)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(a => a.Sigla)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(a => a.Cnpj)
            .HasMaxLength(18)
            .IsFixedLength()   // CHAR(18) — formato XX.XXX.XXX/XXXX-XX
            .IsRequired();

        // Constraints de unicidade
        builder.HasIndex(a => a.Sigla)
            .IsUnique()
            .HasDatabaseName("uq_associacoes_sigla");

        builder.HasIndex(a => a.Cnpj)
            .IsUnique()
            .HasDatabaseName("uq_associacoes_cnpj");

        // Seed data — 7 associações com UUIDs determinísticos (RF-01, RF-03)
        builder.HasData(AssociacaoSeed.GetSeedData());
    }
}
