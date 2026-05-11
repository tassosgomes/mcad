using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class CaptacaoConfiguration : IEntityTypeConfiguration<Captacao>
{
    public void Configure(EntityTypeBuilder<Captacao> builder)
    {
        builder.ToTable("Captacoes");

        builder.HasKey(c => c.Id);

        builder.HasOne(c => c.Rubrica)
            .WithMany()
            .HasForeignKey(c => c.RubricaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(c => c.Periodo)
            .IsRequired();

        builder.Property(c => c.UsuarioDeMusica)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.Status)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(c => c.AnalistaResponsavelId)
            .IsRequired();

        builder.Property(c => c.AnalistaResponsavelNome)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.DistribuicaoProcessada)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(c => c.DistribuicaoProcessadaEm);

        builder.Property(c => c.JustificativaCancelamento)
            .HasMaxLength(1000);

        builder.Property(c => c.CanceladoEm);

        builder.HasIndex(c => new { c.RubricaId, c.Periodo })
            .IsUnique()
            .HasFilter("\"Status\" != 'Cancelada'")
            .HasDatabaseName("uq_captacoes_rubrica_periodo_ativa");
    }
}
