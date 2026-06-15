using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

/// <summary>
/// Configuração EF Core para <see cref="Ocorrencia"/>.
/// Tabela <c>ocorrencias</c> — state machine ABERTA → EM_ANALISE → RESOLVIDA | CANCELADA.
/// ObraId/FonogramaId são referência fraca (sem FK) pois a obra/fonograma pode não existir mais.
/// </summary>
public class OcorrenciaConfiguration : IEntityTypeConfiguration<Ocorrencia>
{
    public void Configure(EntityTypeBuilder<Ocorrencia> builder)
    {
        builder.ToTable("ocorrencias", tb =>
        {
            tb.HasCheckConstraint(
                "ck_ocorrencias_status",
                "\"Status\" IN ('ABERTA','EM_ANALISE','RESOLVIDA','CANCELADA')");
            tb.HasCheckConstraint(
                "ck_ocorrencias_tipo",
                "\"Tipo\" IN ('TITULARIDADE_DIVERGENTE','FONOGRAMA_INCORRETO','DADO_CADASTRAL','OBRA_AUSENTE')");
        });

        builder.HasKey(o => o.Id);

        builder.Property(o => o.Id)
            .HasColumnType("uuid")
            .IsRequired();

        builder.Property(o => o.TitularId)
            .HasColumnType("uuid")
            .IsRequired();

        builder.Property(o => o.Tipo)
            .HasConversion(
                v => v == TipoOcorrencia.TitularidadeDivergente ? "TITULARIDADE_DIVERGENTE" :
                     v == TipoOcorrencia.FonogramaIncorreto ? "FONOGRAMA_INCORRETO" :
                     v == TipoOcorrencia.DadoCadastral ? "DADO_CADASTRAL" :
                     v == TipoOcorrencia.ObraAusente ? "OBRA_AUSENTE" :
                     v.ToString().ToUpperInvariant(),
                v => v == "TITULARIDADE_DIVERGENTE" ? TipoOcorrencia.TitularidadeDivergente :
                     v == "FONOGRAMA_INCORRETO" ? TipoOcorrencia.FonogramaIncorreto :
                     v == "DADO_CADASTRAL" ? TipoOcorrencia.DadoCadastral :
                     v == "OBRA_AUSENTE" ? TipoOcorrencia.ObraAusente :
                     Enum.Parse<TipoOcorrencia>(v, true))
            .HasColumnType("VARCHAR(30)")
            .IsRequired();

        // Referência fraca: sem FK — apenas armazena o Guid para histórico
        builder.Property(o => o.ObraId)
            .HasColumnType("uuid")
            .IsRequired(false);

        builder.Property(o => o.FonogramaId)
            .HasColumnType("uuid")
            .IsRequired(false);

        builder.Property(o => o.Descricao)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(o => o.Status)
            .HasConversion(
                v => v == StatusOcorrencia.EmAnalise ? "EM_ANALISE" :
                     v.ToString().ToUpperInvariant(),
                v => v == "EM_ANALISE" ? StatusOcorrencia.EmAnalise :
                     Enum.Parse<StatusOcorrencia>(v, true))
            .HasColumnType("VARCHAR(20)")
            .IsRequired();

        builder.Property(o => o.Resolucao)
            .HasColumnType("text")
            .IsRequired(false);

        builder.Property(o => o.JustificativaCancelamento)
            .HasColumnType("text")
            .IsRequired(false);

        builder.Property(o => o.AbertaEm)
            .HasColumnType("timestamptz")
            .IsRequired();

        builder.Property(o => o.ResolvidaEm)
            .HasColumnType("timestamptz")
            .IsRequired(false);

        // FK → titulares ON DELETE RESTRICT (não apagar titular com ocorrências)
        builder.HasOne<Titular>()
            .WithMany()
            .HasForeignKey(o => o.TitularId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_ocorrencias_titular");

        builder.HasIndex(o => new { o.TitularId, o.Status })
            .HasDatabaseName("ix_ocorrencias_titular_status");
    }
}
