using Cadastro.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

/// <summary>
/// Fluent API configuration para a entidade OutboxEvent.
/// Mapeia para a tabela outbox_events no schema cadastro.
/// Payload armazenado como JSONB para permitir queries JSON nativas no PostgreSQL.
/// Índice parcial cobre apenas eventos pendentes (PublishedAt IS NULL e Attempts lt 10).
/// </summary>
public class OutboxEventConfiguration : IEntityTypeConfiguration<OutboxEvent>
{
    public void Configure(EntityTypeBuilder<OutboxEvent> builder)
    {
        builder.ToTable("outbox_events");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .IsRequired();

        builder.Property(e => e.Type)
            .HasColumnType("VARCHAR(100)")
            .IsRequired();

        builder.Property(e => e.RoutingKey)
            .HasColumnType("VARCHAR(100)")
            .IsRequired();

        builder.Property(e => e.Subject)
            .HasColumnType("VARCHAR(50)")
            .IsRequired();

        // Payload armazenado como JSONB para queries nativas
        builder.Property(e => e.Payload)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .IsRequired();

        builder.Property(e => e.PublishedAt)
            .IsRequired(false);

        builder.Property(e => e.Attempts)
            .HasDefaultValue(0)
            .IsRequired();

        // Índice parcial otimizado para o worker: somente eventos pendentes
        // WHERE PublishedAt IS NULL AND Attempts < 10
        builder.HasIndex(e => new { e.PublishedAt, e.Attempts })
            .HasFilter("\"PublishedAt\" IS NULL AND \"Attempts\" < 10")
            .HasDatabaseName("ix_outbox_pendentes");
    }
}
