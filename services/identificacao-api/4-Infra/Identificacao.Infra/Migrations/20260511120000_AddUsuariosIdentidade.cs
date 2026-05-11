using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(IdentificacaoDbContext))]
    [Migration("20260511120000_AddUsuariosIdentidade")]
    public partial class AddUsuariosIdentidade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS identificacao.usuarios_identidade (
                    logto_user_id VARCHAR(128) NOT NULL,
                    username VARCHAR(255),
                    display_name VARCHAR(255),
                    email VARCHAR(320),
                    avatar_url VARCHAR(2048),
                    roles JSONB DEFAULT '[]'::jsonb NOT NULL,
                    is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
                    deleted_at_utc TIMESTAMPTZ,
                    raw_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
                    last_event_id VARCHAR(64) NOT NULL,
                    last_event_type VARCHAR(80) NOT NULL,
                    last_event_occurred_at_utc TIMESTAMPTZ NOT NULL,
                    created_at_utc TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                    updated_at_utc TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                    CONSTRAINT pk_usuarios_identidade PRIMARY KEY (logto_user_id),
                    CONSTRAINT ck_usuarios_identidade_roles_array CHECK (jsonb_typeof(roles) = 'array'),
                    CONSTRAINT ck_usuarios_identidade_raw_payload_object CHECK (jsonb_typeof(raw_payload) = 'object')
                );
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS ix_usuarios_identidade_username
                    ON identificacao.usuarios_identidade(username)
                    WHERE username IS NOT NULL;
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS ix_usuarios_identidade_email
                    ON identificacao.usuarios_identidade(email)
                    WHERE email IS NOT NULL;
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS ix_usuarios_identidade_status
                    ON identificacao.usuarios_identidade(is_suspended, deleted_at_utc);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "usuarios_identidade",
                schema: "identificacao");
        }
    }
}
