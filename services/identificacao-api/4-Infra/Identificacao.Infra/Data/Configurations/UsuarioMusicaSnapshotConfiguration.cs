using Identificacao.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class UsuarioMusicaSnapshotConfiguration : IEntityTypeConfiguration<UsuarioMusicaSnapshot>
{
    public void Configure(EntityTypeBuilder<UsuarioMusicaSnapshot> builder)
    {
        builder.ToTable("UsuarioMusicaSnapshot");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.RazaoSocial)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(s => s.Cnpj)
            .IsRequired()
            .HasMaxLength(14);

        builder.Property(s => s.Status)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(s => s.AtualizadoEm)
            .IsRequired();

        builder.HasIndex(s => s.RazaoSocial)
            .HasDatabaseName("ix_usuarios_musica_snapshot_razao_social");
    }
}
