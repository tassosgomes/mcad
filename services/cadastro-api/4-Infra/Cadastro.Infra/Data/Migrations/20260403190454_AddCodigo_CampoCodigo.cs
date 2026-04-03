using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCodigo_CampoCodigo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE SEQUENCE cadastro.seq_associacoes_codigo AS BIGINT START WITH 8 INCREMENT BY 1;");
            migrationBuilder.Sql("CREATE SEQUENCE cadastro.seq_titulares_codigo AS BIGINT START WITH 1 INCREMENT BY 1;");
            migrationBuilder.Sql("CREATE SEQUENCE cadastro.seq_obras_codigo AS BIGINT START WITH 1 INCREMENT BY 1;");
            migrationBuilder.Sql("CREATE SEQUENCE cadastro.seq_fonogramas_codigo AS BIGINT START WITH 1 INCREMENT BY 1;");

            migrationBuilder.AddColumn<long>(
                name: "Codigo",
                schema: "cadastro",
                table: "titulares",
                type: "bigint",
                nullable: false,
                defaultValueSql: "nextval('cadastro.seq_titulares_codigo')");

            migrationBuilder.AddColumn<long>(
                name: "Codigo",
                schema: "cadastro",
                table: "obras_musicais",
                type: "bigint",
                nullable: false,
                defaultValueSql: "nextval('cadastro.seq_obras_codigo')");

            migrationBuilder.AddColumn<long>(
                name: "Codigo",
                schema: "cadastro",
                table: "fonogramas",
                type: "bigint",
                nullable: false,
                defaultValueSql: "nextval('cadastro.seq_fonogramas_codigo')");

            migrationBuilder.AddColumn<long>(
                name: "Codigo",
                schema: "cadastro",
                table: "associacoes",
                type: "bigint",
                nullable: false,
                defaultValueSql: "nextval('cadastro.seq_associacoes_codigo')");

            migrationBuilder.UpdateData(
                schema: "cadastro",
                table: "associacoes",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                column: "Codigo",
                value: 1L);

            migrationBuilder.UpdateData(
                schema: "cadastro",
                table: "associacoes",
                keyColumn: "Id",
                keyValue: new Guid("a7b8c9d0-e1f2-3456-abcd-567890123456"),
                column: "Codigo",
                value: 7L);

            migrationBuilder.UpdateData(
                schema: "cadastro",
                table: "associacoes",
                keyColumn: "Id",
                keyValue: new Guid("b2c3d4e5-f6a7-8901-bcde-f12345678901"),
                column: "Codigo",
                value: 2L);

            migrationBuilder.UpdateData(
                schema: "cadastro",
                table: "associacoes",
                keyColumn: "Id",
                keyValue: new Guid("c3d4e5f6-a7b8-9012-cdef-123456789012"),
                column: "Codigo",
                value: 3L);

            migrationBuilder.UpdateData(
                schema: "cadastro",
                table: "associacoes",
                keyColumn: "Id",
                keyValue: new Guid("d4e5f6a7-b8c9-0123-defa-234567890123"),
                column: "Codigo",
                value: 4L);

            migrationBuilder.UpdateData(
                schema: "cadastro",
                table: "associacoes",
                keyColumn: "Id",
                keyValue: new Guid("e5f6a7b8-c9d0-1234-efab-345678901234"),
                column: "Codigo",
                value: 5L);

            migrationBuilder.UpdateData(
                schema: "cadastro",
                table: "associacoes",
                keyColumn: "Id",
                keyValue: new Guid("f6a7b8c9-d0e1-2345-fabc-456789012345"),
                column: "Codigo",
                value: 6L);

            migrationBuilder.CreateIndex(
                name: "uq_titulares_codigo",
                schema: "cadastro",
                table: "titulares",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_obras_codigo",
                schema: "cadastro",
                table: "obras_musicais",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_fonogramas_codigo",
                schema: "cadastro",
                table: "fonogramas",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_associacoes_codigo",
                schema: "cadastro",
                table: "associacoes",
                column: "Codigo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "uq_titulares_codigo",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropIndex(
                name: "uq_obras_codigo",
                schema: "cadastro",
                table: "obras_musicais");

            migrationBuilder.DropIndex(
                name: "uq_fonogramas_codigo",
                schema: "cadastro",
                table: "fonogramas");

            migrationBuilder.DropIndex(
                name: "uq_associacoes_codigo",
                schema: "cadastro",
                table: "associacoes");

            migrationBuilder.DropColumn(
                name: "Codigo",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Codigo",
                schema: "cadastro",
                table: "obras_musicais");

            migrationBuilder.DropColumn(
                name: "Codigo",
                schema: "cadastro",
                table: "fonogramas");

            migrationBuilder.DropColumn(
                name: "Codigo",
                schema: "cadastro",
                table: "associacoes");

            migrationBuilder.Sql("DROP SEQUENCE cadastro.seq_associacoes_codigo;");
            migrationBuilder.Sql("DROP SEQUENCE cadastro.seq_titulares_codigo;");
            migrationBuilder.Sql("DROP SEQUENCE cadastro.seq_obras_codigo;");
            migrationBuilder.Sql("DROP SEQUENCE cadastro.seq_fonogramas_codigo;");
        }
    }
}
