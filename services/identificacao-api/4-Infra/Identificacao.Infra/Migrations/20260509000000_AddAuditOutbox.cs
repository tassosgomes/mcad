using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(IdentificacaoDbContext))]
    [Migration("20260509000000_AddAuditOutbox")]
    public partial class AddAuditOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS identificacao.audit_outbox (
                    id VARCHAR(36) NOT NULL,
                    event_id VARCHAR(36) NOT NULL,
                    event_type VARCHAR(40) NOT NULL,
                    aggregate_type VARCHAR(128),
                    aggregate_id VARCHAR(256),
                    payload_json JSONB NOT NULL,
                    status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
                    created_at_utc TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                    available_at_utc TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                    sent_at_utc TIMESTAMPTZ,
                    locked_until_utc TIMESTAMPTZ,
                    lock_owner VARCHAR(128),
                    retry_count INTEGER DEFAULT 0 NOT NULL,
                    last_error VARCHAR(4000),
                    CONSTRAINT pk_audit_outbox PRIMARY KEY (id),
                    CONSTRAINT uk_audit_outbox_event UNIQUE (event_id),
                    CONSTRAINT ck_audit_outbox_status CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'FAILED', 'DEAD_LETTER'))
                );
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS ix_audit_outbox_pending
                    ON identificacao.audit_outbox(status, available_at_utc, created_at_utc);
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS ix_audit_outbox_event_type
                    ON identificacao.audit_outbox(event_type, created_at_utc);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_outbox",
                schema: "identificacao");
        }
    }
}
