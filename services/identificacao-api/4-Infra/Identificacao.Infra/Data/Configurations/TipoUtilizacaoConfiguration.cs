using Identificacao.Domain.Entities;
using Identificacao.Infra.Data.Seeds;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class TipoUtilizacaoConfiguration : IEntityTypeConfiguration<TipoUtilizacao>
{
    public void Configure(EntityTypeBuilder<TipoUtilizacao> builder)
    {
        builder.ToTable("TiposUtilizacao");

        builder.HasKey(t => t.Id);
        
        builder.Property(t => t.Sigla).HasMaxLength(10).IsRequired();
        builder.Property(t => t.Descricao).HasMaxLength(100).IsRequired();
        builder.Property(t => t.Peso).HasColumnType("decimal(18,4)");

        builder.HasIndex(t => t.Sigla).IsUnique();

        builder.HasData(TipoUtilizacaoSeed.GetTipos());
    }
}
