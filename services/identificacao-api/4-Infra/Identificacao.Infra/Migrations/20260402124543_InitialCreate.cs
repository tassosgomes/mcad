using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "identificacao");

            migrationBuilder.CreateTable(
                name: "Rubricas",
                schema: "identificacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Sigla = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Nome = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ExigeClassificacao = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rubricas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Captacoes",
                schema: "identificacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RubricaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Periodo = table.Column<DateOnly>(type: "date", nullable: false),
                    UsuarioDeMusica = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AnalistaResponsavelId = table.Column<Guid>(type: "uuid", nullable: false),
                    AnalistaResponsavelNome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Captacoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Captacoes_Rubricas_RubricaId",
                        column: x => x.RubricaId,
                        principalSchema: "identificacao",
                        principalTable: "Rubricas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "identificacao",
                table: "Rubricas",
                columns: new[] { "Id", "ExigeClassificacao", "Nome", "Sigla" },
                values: new object[,]
                {
                    { new Guid("b1a2c3d4-0001-0000-0000-000000000001"), false, "Rádio AM/FM", "RADIO" },
                    { new Guid("b1a2c3d4-0001-0000-0000-000000000002"), true, "TV Aberta", "TV_ABERTA" },
                    { new Guid("b1a2c3d4-0001-0000-0000-000000000003"), true, "TV Fechada", "TV_FECHADA" },
                    { new Guid("b1a2c3d4-0001-0000-0000-000000000004"), true, "Cinema", "CINEMA" },
                    { new Guid("b1a2c3d4-0001-0000-0000-000000000005"), true, "Streaming Vídeo (VOD)", "VOD" },
                    { new Guid("b1a2c3d4-0001-0000-0000-000000000006"), false, "Streaming Áudio", "STREAMING_AUDIO" },
                    { new Guid("b1a2c3d4-0001-0000-0000-000000000007"), false, "Show", "SHOW" }
                });

            migrationBuilder.CreateIndex(
                name: "uq_captacoes_rubrica_periodo_ativa",
                schema: "identificacao",
                table: "Captacoes",
                columns: new[] { "RubricaId", "Periodo" },
                unique: true,
                filter: "\"Status\" != 'Cancelada'");

            migrationBuilder.CreateIndex(
                name: "IX_Rubricas_Sigla",
                schema: "identificacao",
                table: "Rubricas",
                column: "Sigla",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Captacoes",
                schema: "identificacao");

            migrationBuilder.DropTable(
                name: "Rubricas",
                schema: "identificacao");
        }
    }
}
