using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class SyncModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ObraMusicalId",
                schema: "cadastro",
                table: "titularidades_autorais",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FonogramaId1",
                schema: "cadastro",
                table: "participacoes_conexas",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_titularidades_autorais_ObraMusicalId",
                schema: "cadastro",
                table: "titularidades_autorais",
                column: "ObraMusicalId");

            migrationBuilder.CreateIndex(
                name: "IX_participacoes_conexas_FonogramaId1",
                schema: "cadastro",
                table: "participacoes_conexas",
                column: "FonogramaId1");

            migrationBuilder.AddForeignKey(
                name: "FK_participacoes_conexas_fonogramas_FonogramaId1",
                schema: "cadastro",
                table: "participacoes_conexas",
                column: "FonogramaId1",
                principalSchema: "cadastro",
                principalTable: "fonogramas",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_titularidades_autorais_obras_musicais_ObraMusicalId",
                schema: "cadastro",
                table: "titularidades_autorais",
                column: "ObraMusicalId",
                principalSchema: "cadastro",
                principalTable: "obras_musicais",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_participacoes_conexas_fonogramas_FonogramaId1",
                schema: "cadastro",
                table: "participacoes_conexas");

            migrationBuilder.DropForeignKey(
                name: "FK_titularidades_autorais_obras_musicais_ObraMusicalId",
                schema: "cadastro",
                table: "titularidades_autorais");

            migrationBuilder.DropIndex(
                name: "IX_titularidades_autorais_ObraMusicalId",
                schema: "cadastro",
                table: "titularidades_autorais");

            migrationBuilder.DropIndex(
                name: "IX_participacoes_conexas_FonogramaId1",
                schema: "cadastro",
                table: "participacoes_conexas");

            migrationBuilder.DropColumn(
                name: "ObraMusicalId",
                schema: "cadastro",
                table: "titularidades_autorais");

            migrationBuilder.DropColumn(
                name: "FonogramaId1",
                schema: "cadastro",
                table: "participacoes_conexas");
        }
    }
}
