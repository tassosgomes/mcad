using Identificacao.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class ExecucaoConfiguration : IEntityTypeConfiguration<Execucao>
{
    public void Configure(EntityTypeBuilder<Execucao> builder)
    {
        builder.ToTable("Execucoes");

        builder.HasKey(e => e.Id);

        builder.HasOne(e => e.Captacao)
            .WithMany()
            .HasForeignKey(e => e.CaptacaoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.TipoUtilizacao)
            .WithMany()
            .HasForeignKey(e => e.TipoUtilizacaoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Property(e => e.Inicio).HasColumnType("time");
        builder.Property(e => e.Fim).HasColumnType("time");
        builder.Property(e => e.Status).HasConversion<string>();
        
        builder.Property(e => e.ObraTitulo).HasMaxLength(255).IsRequired();
        builder.Property(e => e.FonogramaIsrc).HasMaxLength(15);
        builder.Property(e => e.ObraIswc).HasMaxLength(15);
        builder.Property(e => e.Interpretes).HasMaxLength(500);
        builder.Property(e => e.TituloPrograma).HasMaxLength(255);

        builder.HasIndex(e => e.CaptacaoId).HasDatabaseName("ix_execucoes_captacao");
        builder.HasIndex(e => e.ObraId).HasDatabaseName("ix_execucoes_obra");
    }
}
