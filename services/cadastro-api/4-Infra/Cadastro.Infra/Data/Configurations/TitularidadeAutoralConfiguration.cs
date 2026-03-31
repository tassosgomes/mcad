using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

public class TitularidadeAutoralConfiguration : IEntityTypeConfiguration<TitularidadeAutoral>
{
    public void Configure(EntityTypeBuilder<TitularidadeAutoral> builder)
    {
        builder.ToTable("titularidades_autorais", b =>
        {
            b.HasCheckConstraint("ck_titularidades_categoria", "\"Categoria\" IN ('AUTOR', 'EDITOR')");
            b.HasCheckConstraint("ck_titularidades_percentual", "\"Percentual\" > 0 AND \"Percentual\" <= 100");
        });

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id)
            .HasDefaultValueSql("gen_random_uuid()")
            .IsRequired();

        builder.Property(t => t.ObraId)
            .IsRequired();

        builder.Property(t => t.TitularId)
            .IsRequired();

        builder.Property(t => t.Categoria)
            .HasConversion(
                v => v.ToString().ToUpperInvariant(),
                v => Enum.Parse<CategoriaAutoral>(v, true))
            .HasColumnType("VARCHAR(10)")
            .IsRequired();

        builder.Property(t => t.Percentual)
            .HasColumnType("DECIMAL(8,4)")
            .IsRequired();

        builder.Property(t => t.CriadoEm)
            .HasColumnType("TIMESTAMPTZ")
            .HasDefaultValueSql("NOW()")
            .IsRequired();

        builder.HasOne(t => t.Obra)
            .WithMany()
            .HasForeignKey(t => t.ObraId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Titular)
            .WithMany()
            .HasForeignKey(t => t.TitularId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => new { t.ObraId, t.TitularId, t.Categoria })
            .IsUnique()
            .HasDatabaseName("uq_titularidades_obra_titular_categoria");

        builder.HasIndex(t => t.ObraId)
            .HasDatabaseName("ix_titularidades_obra");

        builder.HasIndex(t => t.TitularId)
            .HasDatabaseName("ix_titularidades_titular");
    }
}
