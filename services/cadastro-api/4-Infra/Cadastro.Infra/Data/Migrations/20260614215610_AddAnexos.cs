using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAnexos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "anexos",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StorageFileId = table.Column<string>(type: "VARCHAR(26)", nullable: false),
                    EntidadeTipo = table.Column<string>(type: "VARCHAR(10)", nullable: false),
                    EntidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Categoria = table.Column<string>(type: "VARCHAR(22)", nullable: false),
                    NomeOriginal = table.Column<string>(type: "VARCHAR(255)", nullable: false),
                    ContentType = table.Column<string>(type: "VARCHAR(100)", nullable: false),
                    TamanhoBytes = table.Column<long>(type: "bigint", nullable: false),
                    StatusScan = table.Column<string>(type: "VARCHAR(14)", nullable: false),
                    UploadadoPor = table.Column<string>(type: "VARCHAR(200)", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExcluidoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_anexos", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_anexos_entidade",
                schema: "cadastro",
                table: "anexos",
                columns: new[] { "EntidadeTipo", "EntidadeId" });

            migrationBuilder.CreateIndex(
                name: "ix_anexos_status_scan_ativo",
                schema: "cadastro",
                table: "anexos",
                column: "StatusScan",
                filter: "\"ExcluidoEm\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "uq_anexos_entidade_categoria_ativo",
                schema: "cadastro",
                table: "anexos",
                columns: new[] { "EntidadeId", "Categoria" },
                unique: true,
                filter: "\"ExcluidoEm\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "anexos",
                schema: "cadastro");
        }
    }
}
