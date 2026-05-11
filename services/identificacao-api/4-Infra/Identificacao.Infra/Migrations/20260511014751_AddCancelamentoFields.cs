using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCancelamentoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CanceladoEm",
                schema: "identificacao",
                table: "Captacoes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "DistribuicaoProcessada",
                schema: "identificacao",
                table: "Captacoes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DistribuicaoProcessadaEm",
                schema: "identificacao",
                table: "Captacoes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "JustificativaCancelamento",
                schema: "identificacao",
                table: "Captacoes",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanceladoEm",
                schema: "identificacao",
                table: "Captacoes");

            migrationBuilder.DropColumn(
                name: "DistribuicaoProcessada",
                schema: "identificacao",
                table: "Captacoes");

            migrationBuilder.DropColumn(
                name: "DistribuicaoProcessadaEm",
                schema: "identificacao",
                table: "Captacoes");

            migrationBuilder.DropColumn(
                name: "JustificativaCancelamento",
                schema: "identificacao",
                table: "Captacoes");
        }
    }
}
