using Cadastro.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

/// <summary>
/// Configuração EF Core para <see cref="CredencialTitular"/> (1:1 com Titular).
/// Tabela <c>credenciais_titular</c> — isola a coluna sensível SenhaHash (RF-04).
/// TitularId é UNIQUE com FK ON DELETE CASCADE (a credencial some com o titular).
/// </summary>
public class CredencialTitularConfiguration : IEntityTypeConfiguration<CredencialTitular>
{
    public void Configure(EntityTypeBuilder<CredencialTitular> builder)
    {
        builder.ToTable("credenciais_titular");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id)
            .HasColumnType("uuid")
            .IsRequired();

        builder.Property(c => c.TitularId)
            .HasColumnType("uuid")
            .IsRequired();

        builder.Property(c => c.SenhaHash)
            .HasColumnName("SenhaHash")
            .HasColumnType("VARCHAR(60)")
            .IsRequired();

        builder.Property(c => c.TentativasFalhas)
            .HasColumnType("integer")
            .HasDefaultValue(0)
            .IsRequired();

        builder.Property(c => c.BloqueadoAte)
            .HasColumnType("timestamptz")
            .IsRequired(false);

        builder.Property(c => c.CriadoEm)
            .HasColumnType("timestamptz")
            .IsRequired();

        builder.Property(c => c.AtualizadoEm)
            .HasColumnType("timestamptz")
            .IsRequired();

        // 1:1 com Titular — UNIQUE no TitularId garante cardinalidade
        builder.HasIndex(c => c.TitularId)
            .IsUnique()
            .HasDatabaseName("uq_credenciais_titular_titular");

        // FK → titulares ON DELETE CASCADE (a credencial some com o titular)
        builder.HasOne<Titular>()
            .WithOne()
            .HasForeignKey<CredencialTitular>(c => c.TitularId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("fk_credenciais_titular_titular");
    }
}
