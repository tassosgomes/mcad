using Cadastro.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

public class HistoricoBloqueioConfiguration : IEntityTypeConfiguration<HistoricoBloqueio>
{
    public void Configure(EntityTypeBuilder<HistoricoBloqueio> builder)
    {
        builder.ToTable("historico_bloqueios", tb =>
        {
            tb.HasCheckConstraint("ck_historico_tipo", "\"EntidadeTipo\" IN ('OBRA', 'FONOGRAMA')");
            tb.HasCheckConstraint("ck_historico_acao", "\"Acao\" IN ('BLOQUEIO', 'DESBLOQUEIO')");
        });

        builder.HasKey(h => h.Id);

        builder.Property(h => h.EntidadeTipo)
            .HasColumnType("VARCHAR(15)")
            .IsRequired();

        builder.Property(h => h.EntidadeId)
            .IsRequired();

        builder.Property(h => h.Acao)
            .HasColumnType("VARCHAR(15)")
            .IsRequired();

        builder.Property(h => h.Justificativa)
            .HasColumnType("VARCHAR(500)")
            .IsRequired(false);

        builder.Property(h => h.DataHora)
            .HasColumnType("TIMESTAMPTZ")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();

        builder.HasIndex(h => new { h.EntidadeTipo, h.EntidadeId })
            .HasDatabaseName("ix_historico_entidade");
    }
}
