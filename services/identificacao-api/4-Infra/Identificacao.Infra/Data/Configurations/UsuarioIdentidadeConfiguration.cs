using System.Text.Json;
using Identificacao.Domain.Identidade;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class UsuarioIdentidadeConfiguration : IEntityTypeConfiguration<UsuarioIdentidade>
{
    public void Configure(EntityTypeBuilder<UsuarioIdentidade> builder)
    {
        builder.ToTable("usuarios_identidade", "identificacao", t => t.ExcludeFromMigrations());

        builder.HasKey(u => u.LogtoUserId);

        builder.Property(u => u.LogtoUserId)
            .HasColumnName("logto_user_id")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(u => u.Username)
            .HasColumnName("username")
            .HasMaxLength(255);

        builder.Property(u => u.DisplayName)
            .HasColumnName("display_name")
            .HasMaxLength(255);

        builder.Property(u => u.Email)
            .HasColumnName("email")
            .HasMaxLength(320);

        builder.Property(u => u.Roles)
            .HasColumnName("roles")
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

        builder.Property(u => u.IsSuspended)
            .HasColumnName("is_suspended")
            .IsRequired();

        builder.Property(u => u.DeletedAtUtc)
            .HasColumnName("deleted_at_utc");

        builder.Ignore(u => u.NomeExibicao);
    }
}
