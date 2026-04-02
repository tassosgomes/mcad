using Identificacao.Domain.Entities;
using Identificacao.Infra.Data.Seeds;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class RubricaConfiguration : IEntityTypeConfiguration<Rubrica>
{
    public void Configure(EntityTypeBuilder<Rubrica> builder)
    {
        builder.ToTable("Rubricas");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Sigla)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(r => r.Sigla)
            .IsUnique();

        builder.Property(r => r.Nome)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(r => r.ExigeClassificacao)
            .IsRequired();

        builder.HasData(RubricaSeed.GetRubricas());
    }
}
