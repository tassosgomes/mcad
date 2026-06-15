using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

/// <summary>
/// Configuração EF Core para <see cref="SolicitacaoAlteracao"/>.
/// Tabela <c>solicitacoes_alteracao</c> — state machine SOLICITADA → APROVADA | REJEITADA.
/// </summary>
public class SolicitacaoAlteracaoConfiguration : IEntityTypeConfiguration<SolicitacaoAlteracao>
{
    public void Configure(EntityTypeBuilder<SolicitacaoAlteracao> builder)
    {
        builder.ToTable("solicitacoes_alteracao", tb =>
        {
            tb.HasCheckConstraint(
                "ck_solicitacoes_alteracao_campo",
                "\"Campo\" IN ('NOME','CAE_IPI','ASSOCIACAO','CATEGORIA')");
            tb.HasCheckConstraint(
                "ck_solicitacoes_alteracao_status",
                "\"Status\" IN ('SOLICITADA','APROVADA','REJEITADA')");
        });

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id)
            .HasColumnType("uuid")
            .IsRequired();

        builder.Property(s => s.TitularId)
            .HasColumnType("uuid")
            .IsRequired();

        builder.Property(s => s.Campo)
            .HasConversion(
                v => v == CampoSolicitacao.CaeIpi ? "CAE_IPI" :
                     v.ToString().ToUpperInvariant(),
                v => v == "CAE_IPI" ? CampoSolicitacao.CaeIpi :
                     Enum.Parse<CampoSolicitacao>(v, true))
            .HasColumnType("VARCHAR(15)")
            .IsRequired();

        builder.Property(s => s.ValorAtual)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(s => s.ValorPretendido)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(s => s.Justificativa)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(s => s.Status)
            .HasConversion(
                v => v.ToString().ToUpperInvariant(),
                v => Enum.Parse<StatusSolicitacao>(v, true))
            .HasColumnType("VARCHAR(15)")
            .IsRequired();

        builder.Property(s => s.SolicitadaEm)
            .HasColumnType("timestamptz")
            .IsRequired();

        builder.Property(s => s.DecisaoPor)
            .HasColumnType("uuid")
            .IsRequired(false);

        builder.Property(s => s.DecididaEm)
            .HasColumnType("timestamptz")
            .IsRequired(false);

        builder.Property(s => s.JustificativaRejeicao)
            .HasColumnType("text")
            .IsRequired(false);

        // FK → titulares ON DELETE RESTRICT
        builder.HasOne<Titular>()
            .WithMany()
            .HasForeignKey(s => s.TitularId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_solicitacoes_alteracao_titular");

        builder.HasIndex(s => new { s.TitularId, s.Status })
            .HasDatabaseName("ix_solicitacoes_alteracao_titular_status");
    }
}
