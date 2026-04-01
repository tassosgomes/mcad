using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddParticipacoesConexas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "PercentuaisDesatualizados",
                schema: "cadastro",
                table: "fonogramas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "participacoes_conexas",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    FonogramaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TitularId = table.Column<Guid>(type: "uuid", nullable: false),
                    Categoria = table.Column<string>(type: "VARCHAR(25)", nullable: false),
                    Percentual = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "TIMESTAMPTZ", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_participacoes_conexas", x => x.Id);
                    table.CheckConstraint("ck_participacoes_categoria", "\"Categoria\" IN ('INTERPRETE', 'PRODUTOR_FONOGRAFICO', 'MUSICO_EXECUTANTE')");
                    table.CheckConstraint("ck_participacoes_percentual", "\"Percentual\" IS NULL OR (\"Percentual\" > 0 AND \"Percentual\" <= 100)");
                    table.ForeignKey(
                        name: "FK_participacoes_conexas_fonogramas_FonogramaId",
                        column: x => x.FonogramaId,
                        principalSchema: "cadastro",
                        principalTable: "fonogramas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_participacoes_conexas_titulares_TitularId",
                        column: x => x.TitularId,
                        principalSchema: "cadastro",
                        principalTable: "titulares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_participacoes_fonograma",
                schema: "cadastro",
                table: "participacoes_conexas",
                column: "FonogramaId");

            migrationBuilder.CreateIndex(
                name: "ix_participacoes_titular",
                schema: "cadastro",
                table: "participacoes_conexas",
                column: "TitularId");

            migrationBuilder.CreateIndex(
                name: "uq_participacoes_fono_titular_cat",
                schema: "cadastro",
                table: "participacoes_conexas",
                columns: new[] { "FonogramaId", "TitularId", "Categoria" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "participacoes_conexas",
                schema: "cadastro");

            migrationBuilder.DropColumn(
                name: "PercentuaisDesatualizados",
                schema: "cadastro",
                table: "fonogramas");
        }
    }
}
