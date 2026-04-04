using Identificacao.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class OutboxEventConfiguration : IEntityTypeConfiguration<OutboxEvent>
{
    public void Configure(EntityTypeBuilder<OutboxEvent> builder)
    {
        builder.ToTable("outbox_events");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).IsRequired();
        builder.Property(e => e.Type).HasColumnType("VARCHAR(100)").IsRequired();
        builder.Property(e => e.RoutingKey).HasColumnType("VARCHAR(100)").IsRequired();
        builder.Property(e => e.Subject).HasColumnType("VARCHAR(50)").IsRequired();
        builder.Property(e => e.Payload).HasColumnType("jsonb").IsRequired();
        builder.Property(e => e.CreatedAt).IsRequired();
        builder.Property(e => e.PublishedAt).IsRequired(false);
        builder.Property(e => e.Attempts).HasDefaultValue(0).IsRequired();

        builder.HasIndex(e => new { e.PublishedAt, e.Attempts })
            .HasFilter("\"PublishedAt\" IS NULL AND \"Attempts\" < 10")
            .HasDatabaseName("ix_outbox_pendentes");
    }
}
