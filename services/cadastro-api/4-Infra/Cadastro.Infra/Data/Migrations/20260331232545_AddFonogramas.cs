using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFonogramas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "fonogramas",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Isrc = table.Column<string>(type: "VARCHAR(12)", nullable: false),
                    ObraId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaisOrigem = table.Column<string>(type: "VARCHAR(100)", nullable: false),
                    DataGravacao = table.Column<DateOnly>(type: "DATE", nullable: true),
                    DataLancamento = table.Column<DateOnly>(type: "DATE", nullable: true),
                    Status = table.Column<string>(type: "VARCHAR(25)", nullable: false),
                    FonogramaDepuradoParaId = table.Column<Guid>(type: "uuid", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fonogramas", x => x.Id);
                    table.CheckConstraint("ck_fonogramas_status", "\"Status\" IN ('PENDENTE_VALIDACAO', 'PENDENTE_DOCUMENTACAO', 'LIBERADO', 'DEPURADO')");
                    table.ForeignKey(
                        name: "FK_fonogramas_fonogramas_FonogramaDepuradoParaId",
                        column: x => x.FonogramaDepuradoParaId,
                        principalSchema: "cadastro",
                        principalTable: "fonogramas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_fonogramas_obras_musicais_ObraId",
                        column: x => x.ObraId,
                        principalSchema: "cadastro",
                        principalTable: "obras_musicais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_fonogramas_depurado_para",
                schema: "cadastro",
                table: "fonogramas",
                column: "FonogramaDepuradoParaId",
                filter: "\"FonogramaDepuradoParaId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_fonogramas_obra",
                schema: "cadastro",
                table: "fonogramas",
                column: "ObraId");

            migrationBuilder.CreateIndex(
                name: "ix_fonogramas_status",
                schema: "cadastro",
                table: "fonogramas",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "uq_fonogramas_isrc",
                schema: "cadastro",
                table: "fonogramas",
                column: "Isrc",
                unique: true,
                filter: "\"Isrc\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fonogramas",
                schema: "cadastro");
        }
    }
}
