using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "cadastro");

            migrationBuilder.CreateTable(
                name: "associacoes",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Sigla = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Cnpj = table.Column<string>(type: "character(18)", fixedLength: true, maxLength: 18, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_associacoes", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "cadastro",
                table: "associacoes",
                columns: new[] { "Id", "Cnpj", "Nome", "Sigla" },
                values: new object[,]
                {
                    { new Guid("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), "50.997.063/0001-32", "Associação Brasileira de Música e Artes", "ABRAMUS" },
                    { new Guid("a7b8c9d0-e1f2-3456-abcd-567890123456"), "33.576.166/0001-00", "União Brasileira de Compositores", "UBC" },
                    { new Guid("b2c3d4e5-f6a7-8901-bcde-f12345678901"), "30.713.325/0001-82", "Associação de Músicos, Arranjadores e Regentes", "AMAR" },
                    { new Guid("c3d4e5f6-a7b8-9012-cdef-123456789012"), "43.985.563/0001-99", "Associação de Intérpretes e Músicos", "ASSIM" },
                    { new Guid("d4e5f6a7-b8c9-0123-defa-234567890123"), "33.780.222/0001-23", "Sociedade Brasileira de Autores, Compositores e Escritores de Música", "SBACEM" },
                    { new Guid("e5f6a7b8-c9d0-1234-efab-345678901234"), "62.092.010/0001-51", "Sociedade Independente de Compositores e Autores Musicais", "SICAM" },
                    { new Guid("f6a7b8c9-d0e1-2345-fabc-456789012345"), "33.748.146/0001-79", "Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais", "SOCINPRO" }
                });

            migrationBuilder.CreateIndex(
                name: "uq_associacoes_cnpj",
                schema: "cadastro",
                table: "associacoes",
                column: "Cnpj",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_associacoes_sigla",
                schema: "cadastro",
                table: "associacoes",
                column: "Sigla",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "associacoes",
                schema: "cadastro");
        }
    }
}
