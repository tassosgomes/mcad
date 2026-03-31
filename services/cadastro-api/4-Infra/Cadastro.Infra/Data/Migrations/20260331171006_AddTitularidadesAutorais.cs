using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTitularidadesAutorais : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "titularidades_autorais",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    ObraId = table.Column<Guid>(type: "uuid", nullable: false),
                    TitularId = table.Column<Guid>(type: "uuid", nullable: false),
                    Categoria = table.Column<string>(type: "VARCHAR(10)", nullable: false),
                    Percentual = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TIMESTAMPTZ", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_titularidades_autorais", x => x.Id);
                    table.CheckConstraint("ck_titularidades_categoria", "\"Categoria\" IN ('AUTOR', 'EDITOR')");
                    table.CheckConstraint("ck_titularidades_percentual", "\"Percentual\" > 0 AND \"Percentual\" <= 100");
                    table.ForeignKey(
                        name: "FK_titularidades_autorais_obras_musicais_ObraId",
                        column: x => x.ObraId,
                        principalSchema: "cadastro",
                        principalTable: "obras_musicais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_titularidades_autorais_titulares_TitularId",
                        column: x => x.TitularId,
                        principalSchema: "cadastro",
                        principalTable: "titulares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_titularidades_obra",
                schema: "cadastro",
                table: "titularidades_autorais",
                column: "ObraId");

            migrationBuilder.CreateIndex(
                name: "ix_titularidades_titular",
                schema: "cadastro",
                table: "titularidades_autorais",
                column: "TitularId");

            migrationBuilder.CreateIndex(
                name: "uq_titularidades_obra_titular_categoria",
                schema: "cadastro",
                table: "titularidades_autorais",
                columns: new[] { "ObraId", "TitularId", "Categoria" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "titularidades_autorais",
                schema: "cadastro");
        }
    }
}
