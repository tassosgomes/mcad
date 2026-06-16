using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioMusicaSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UsuarioMusicaSnapshot",
                schema: "identificacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RazaoSocial = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Cnpj = table.Column<string>(type: "character varying(14)", maxLength: 14, nullable: false),
                    Status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioMusicaSnapshot", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_usuarios_musica_snapshot_razao_social",
                schema: "identificacao",
                table: "UsuarioMusicaSnapshot",
                column: "RazaoSocial");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UsuarioMusicaSnapshot",
                schema: "identificacao");
        }
    }
}
