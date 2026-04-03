using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddExecucoesETiposUtilizacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TiposUtilizacao",
                schema: "identificacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Sigla = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Descricao = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Peso = table.Column<decimal>(type: "numeric(18,4)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TiposUtilizacao", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Execucoes",
                schema: "identificacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaptacaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ObraId = table.Column<Guid>(type: "uuid", nullable: false),
                    FonogramaId = table.Column<Guid>(type: "uuid", nullable: true),
                    ObraTitulo = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FonogramaIsrc = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    ObraIswc = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    Interpretes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Inicio = table.Column<TimeOnly>(type: "time", nullable: false),
                    Fim = table.Column<TimeOnly>(type: "time", nullable: false),
                    DuracaoSegundos = table.Column<int>(type: "integer", nullable: false),
                    Quantidade = table.Column<int>(type: "integer", nullable: false),
                    TipoUtilizacaoId = table.Column<Guid>(type: "uuid", nullable: true),
                    TituloPrograma = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Execucoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Execucoes_Captacoes_CaptacaoId",
                        column: x => x.CaptacaoId,
                        principalSchema: "identificacao",
                        principalTable: "Captacoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Execucoes_TiposUtilizacao_TipoUtilizacaoId",
                        column: x => x.TipoUtilizacaoId,
                        principalSchema: "identificacao",
                        principalTable: "TiposUtilizacao",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                schema: "identificacao",
                table: "TiposUtilizacao",
                columns: new[] { "Id", "Descricao", "Peso", "Sigla" },
                values: new object[,]
                {
                    { new Guid("d1e2f3a4-0001-0000-0000-000000000001"), "Tema de Abertura", 1.0m, "TA" },
                    { new Guid("d1e2f3a4-0001-0000-0000-000000000002"), "Tema de Encerramento", 1.0m, "TE" },
                    { new Guid("d1e2f3a4-0001-0000-0000-000000000003"), "Performance Cênica", 1.0m, "PE" },
                    { new Guid("d1e2f3a4-0001-0000-0000-000000000004"), "Background (Música de Fundo)", 0.0833m, "BK" }
                });

            migrationBuilder.CreateIndex(
                name: "ix_execucoes_captacao",
                schema: "identificacao",
                table: "Execucoes",
                column: "CaptacaoId");

            migrationBuilder.CreateIndex(
                name: "ix_execucoes_obra",
                schema: "identificacao",
                table: "Execucoes",
                column: "ObraId");

            migrationBuilder.CreateIndex(
                name: "IX_Execucoes_TipoUtilizacaoId",
                schema: "identificacao",
                table: "Execucoes",
                column: "TipoUtilizacaoId");

            migrationBuilder.CreateIndex(
                name: "IX_TiposUtilizacao_Sigla",
                schema: "identificacao",
                table: "TiposUtilizacao",
                column: "Sigla",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Execucoes",
                schema: "identificacao");

            migrationBuilder.DropTable(
                name: "TiposUtilizacao",
                schema: "identificacao");
        }
    }
}
