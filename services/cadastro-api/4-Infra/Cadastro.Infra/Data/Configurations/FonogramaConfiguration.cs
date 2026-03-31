using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

public class FonogramaConfiguration : IEntityTypeConfiguration<Fonograma>
{
    public void Configure(EntityTypeBuilder<Fonograma> builder)
    {
        builder.ToTable("fonogramas", tb =>
        {
            tb.HasCheckConstraint("ck_fonogramas_status", "\"Status\" IN ('PENDENTE_VALIDACAO', 'PENDENTE_DOCUMENTACAO', 'LIBERADO', 'DEPURADO')");
        });

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Isrc)
            .HasConversion(
                v => v.Valor,
                v => Isrc.Create(v))
            .HasColumnType("VARCHAR(12)")
            .IsRequired();

        builder.Property(f => f.ObraId)
            .IsRequired();

        builder.Property(f => f.PaisOrigem)
            .HasColumnType("VARCHAR(100)")
            .IsRequired();

        builder.Property(f => f.DataGravacao)
            .HasColumnType("DATE")
            .IsRequired(false);

        builder.Property(f => f.DataLancamento)
            .HasColumnType("DATE")
            .IsRequired(false);

        builder.Property(f => f.Status)
            .HasConversion(
                v => v == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                     v == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                     v.ToString().ToUpperInvariant(),
                v => v == "PENDENTE_VALIDACAO" ? StatusFonograma.PendenteValidacao :
                     v == "PENDENTE_DOCUMENTACAO" ? StatusFonograma.PendenteDocumentacao :
                     Enum.Parse<StatusFonograma>(v, true))
            .HasColumnType("VARCHAR(25)")
            .IsRequired();

        builder.Property(f => f.FonogramaDepuradoParaId)
            .IsRequired(false);

        builder.Property(f => f.CriadoEm)
            .IsRequired();

        builder.Property(f => f.AtualizadoEm)
            .IsRequired();

        builder.HasOne(f => f.Obra)
            .WithMany()
            .HasForeignKey(f => f.ObraId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(f => f.FonogramaDepuradoPara)
            .WithMany()
            .HasForeignKey(f => f.FonogramaDepuradoParaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(f => f.Isrc)
            .IsUnique()
            .HasFilter("\"Isrc\" IS NOT NULL")
            .HasDatabaseName("uq_fonogramas_isrc");

        builder.HasIndex(f => f.ObraId)
            .HasDatabaseName("ix_fonogramas_obra");

        builder.HasIndex(f => f.Status)
            .HasDatabaseName("ix_fonogramas_status");

        builder.HasIndex(f => f.FonogramaDepuradoParaId)
            .HasFilter("\"FonogramaDepuradoParaId\" IS NOT NULL")
            .HasDatabaseName("ix_fonogramas_depurado_para");
    }
}
