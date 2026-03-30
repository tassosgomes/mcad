using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTitulares : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "titulares",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Tipo = table.Column<string>(type: "VARCHAR(2)", nullable: false),
                    Cpf = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    Cnpj = table.Column<string>(type: "character varying(14)", maxLength: 14, nullable: true),
                    Nacionalidade = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CaeIpi = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AssociacaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "VARCHAR(15)", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_titulares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_titulares_associacoes_AssociacaoId",
                        column: x => x.AssociacaoId,
                        principalSchema: "cadastro",
                        principalTable: "associacoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_titulares_associacao",
                schema: "cadastro",
                table: "titulares",
                column: "AssociacaoId");

            migrationBuilder.CreateIndex(
                name: "ix_titulares_status",
                schema: "cadastro",
                table: "titulares",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "uq_titulares_cnpj",
                schema: "cadastro",
                table: "titulares",
                column: "Cnpj",
                unique: true,
                filter: "\"Cnpj\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "uq_titulares_cpf",
                schema: "cadastro",
                table: "titulares",
                column: "Cpf",
                unique: true,
                filter: "\"Cpf\" IS NOT NULL");

            // Extensão pg_trgm para suporte a GIN index com ILike performático
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            // CHECK constraint: consistência tipo↔documento no nível do banco
            migrationBuilder.Sql(@"
                ALTER TABLE cadastro.titulares
                ADD CONSTRAINT ck_titulares_documento CHECK (
                    (""Tipo"" = 'PF' AND ""Cpf"" IS NOT NULL AND ""Cnpj"" IS NULL) OR
                    (""Tipo"" = 'PJ' AND ""Cnpj"" IS NOT NULL AND ""Cpf"" IS NULL)
                );");

            // GIN trigram index no Nome para ILike case-insensitive performático (RF-15)
            migrationBuilder.Sql(
                @"CREATE INDEX ix_titulares_nome ON cadastro.titulares USING gin (""Nome"" gin_trgm_ops);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "titulares",
                schema: "cadastro");
        }
    }
}
