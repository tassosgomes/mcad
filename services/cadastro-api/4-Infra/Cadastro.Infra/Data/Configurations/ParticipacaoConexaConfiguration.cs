using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

public class ParticipacaoConexaConfiguration : IEntityTypeConfiguration<ParticipacaoConexa>
{
    public void Configure(EntityTypeBuilder<ParticipacaoConexa> builder)
    {
        builder.ToTable("participacoes_conexas", b =>
        {
            b.HasCheckConstraint("ck_participacoes_categoria", "\"Categoria\" IN ('INTERPRETE', 'PRODUTOR_FONOGRAFICO', 'MUSICO_EXECUTANTE')");
            b.HasCheckConstraint("ck_participacoes_percentual", "\"Percentual\" IS NULL OR (\"Percentual\" > 0 AND \"Percentual\" <= 100)");
        });

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .HasDefaultValueSql("gen_random_uuid()")
            .IsRequired();

        builder.Property(p => p.FonogramaId)
            .IsRequired();

        builder.Property(p => p.TitularId)
            .IsRequired();

        builder.Property(p => p.Categoria)
            .HasConversion(
                v => v == CategoriaConexo.ProdutorFonografico ? "PRODUTOR_FONOGRAFICO" :
                     v == CategoriaConexo.MusicoExecutante ? "MUSICO_EXECUTANTE" : "INTERPRETE",
                v => v == "PRODUTOR_FONOGRAFICO" ? CategoriaConexo.ProdutorFonografico :
                     v == "MUSICO_EXECUTANTE" ? CategoriaConexo.MusicoExecutante : CategoriaConexo.Interprete)
            .HasColumnType("VARCHAR(25)")
            .IsRequired();

        builder.Property(p => p.Percentual)
            .HasColumnType("DECIMAL(8,4)")
            .IsRequired(false);

        builder.Property(p => p.CriadoEm)
            .HasColumnType("TIMESTAMPTZ")
            .HasDefaultValueSql("NOW()")
            .IsRequired();

        builder.HasOne(p => p.Fonograma)
            .WithMany()
            .HasForeignKey(p => p.FonogramaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Titular)
            .WithMany()
            .HasForeignKey(p => p.TitularId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => new { p.FonogramaId, p.TitularId, p.Categoria })
            .IsUnique()
            .HasDatabaseName("uq_participacoes_fono_titular_cat");

        builder.HasIndex(p => p.FonogramaId)
            .HasDatabaseName("ix_participacoes_fonograma");

        builder.HasIndex(p => p.TitularId)
            .HasDatabaseName("ix_participacoes_titular");
    }
}
