using Identificacao.Infra.Audit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class AuditOutboxEventConfiguration : IEntityTypeConfiguration<AuditOutboxEvent>
{
    public void Configure(EntityTypeBuilder<AuditOutboxEvent> builder)
    {
        builder.ToTable("audit_outbox", "identificacao");

        builder.HasKey(e => e.Id).HasName("pk_audit_outbox");

        builder.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
        builder.Property(e => e.EventId).HasColumnName("event_id").HasMaxLength(36).IsRequired();
        builder.Property(e => e.EventType).HasColumnName("event_type").HasMaxLength(40).IsRequired();
        builder.Property(e => e.AggregateType).HasColumnName("aggregate_type").HasMaxLength(128);
        builder.Property(e => e.AggregateId).HasColumnName("aggregate_id").HasMaxLength(256);
        builder.Property(e => e.PayloadJson).HasColumnName("payload_json").HasColumnType("jsonb").IsRequired();
        builder.Property(e => e.Status).HasColumnName("status").HasMaxLength(30).HasDefaultValue("PENDING").IsRequired();
        builder.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone");
        builder.Property(e => e.AvailableAtUtc).HasColumnName("available_at_utc").HasColumnType("timestamp with time zone");
        builder.Property(e => e.SentAtUtc).HasColumnName("sent_at_utc").HasColumnType("timestamp with time zone");
        builder.Property(e => e.LockedUntilUtc).HasColumnName("locked_until_utc").HasColumnType("timestamp with time zone");
        builder.Property(e => e.LockOwner).HasColumnName("lock_owner").HasMaxLength(128);
        builder.Property(e => e.RetryCount).HasColumnName("retry_count").HasDefaultValue(0);
        builder.Property(e => e.LastError).HasColumnName("last_error").HasMaxLength(4000);

        builder.HasIndex(e => e.EventId).IsUnique().HasDatabaseName("uk_audit_outbox_event");
        builder.HasIndex(e => new { e.Status, e.AvailableAtUtc, e.CreatedAtUtc }).HasDatabaseName("ix_audit_outbox_pending");
        builder.HasIndex(e => new { e.EventType, e.CreatedAtUtc }).HasDatabaseName("ix_audit_outbox_event_type");
    }
}
