using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddControleStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_fonogramas_status",
                schema: "cadastro",
                table: "fonogramas");

            migrationBuilder.AddColumn<string>(
                name: "BloqueioJustificativa",
                schema: "cadastro",
                table: "obras_musicais",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BloqueioJustificativa",
                schema: "cadastro",
                table: "fonogramas",
                type: "VARCHAR(500)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UrlAudio",
                schema: "cadastro",
                table: "fonogramas",
                type: "VARCHAR(500)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "historico_bloqueios",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntidadeTipo = table.Column<string>(type: "VARCHAR(15)", nullable: false),
                    EntidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Acao = table.Column<string>(type: "VARCHAR(15)", nullable: false),
                    Justificativa = table.Column<string>(type: "VARCHAR(500)", nullable: true),
                    DataHora = table.Column<DateTime>(type: "TIMESTAMPTZ", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_historico_bloqueios", x => x.Id);
                    table.CheckConstraint("ck_historico_acao", "\"Acao\" IN ('BLOQUEIO', 'DESBLOQUEIO')");
                    table.CheckConstraint("ck_historico_tipo", "\"EntidadeTipo\" IN ('OBRA', 'FONOGRAMA')");
                });

            migrationBuilder.DropCheckConstraint(
                name: "ck_obras_status",
                schema: "cadastro",
                table: "obras_musicais");

            migrationBuilder.AddCheckConstraint(
                name: "ck_obras_status",
                schema: "cadastro",
                table: "obras_musicais",
                sql: "\"Status\" IN ('PENDENTE', 'LIBERADO', 'BLOQUEADO', 'DOMINIO_PUBLICO', 'DEPURADA')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_fonogramas_status",
                schema: "cadastro",
                table: "fonogramas",
                sql: "\"Status\" IN ('PENDENTE_VALIDACAO', 'PENDENTE_DOCUMENTACAO', 'LIBERADO', 'BLOQUEADO', 'DEPURADO')");

            migrationBuilder.CreateIndex(
                name: "ix_historico_entidade",
                schema: "cadastro",
                table: "historico_bloqueios",
                columns: new[] { "EntidadeTipo", "EntidadeId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "historico_bloqueios",
                schema: "cadastro");

            migrationBuilder.DropCheckConstraint(
                name: "ck_obras_status",
                schema: "cadastro",
                table: "obras_musicais");

            migrationBuilder.DropCheckConstraint(
                name: "ck_fonogramas_status",
                schema: "cadastro",
                table: "fonogramas");

            migrationBuilder.DropColumn(
                name: "BloqueioJustificativa",
                schema: "cadastro",
                table: "obras_musicais");

            migrationBuilder.DropColumn(
                name: "BloqueioJustificativa",
                schema: "cadastro",
                table: "fonogramas");

            migrationBuilder.DropColumn(
                name: "UrlAudio",
                schema: "cadastro",
                table: "fonogramas");

            migrationBuilder.AddCheckConstraint(
                name: "ck_fonogramas_status",
                schema: "cadastro",
                table: "fonogramas",
                sql: "\"Status\" IN ('PENDENTE_VALIDACAO', 'PENDENTE_DOCUMENTACAO', 'LIBERADO', 'DEPURADO')");
        }
    }
}
