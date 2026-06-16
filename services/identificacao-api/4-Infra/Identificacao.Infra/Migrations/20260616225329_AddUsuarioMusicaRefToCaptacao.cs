using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioMusicaRefToCaptacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "UsuarioDeMusica",
                schema: "identificacao",
                table: "Captacoes",
                newName: "UsuarioMusicaNome");

            migrationBuilder.AddColumn<Guid>(
                name: "UsuarioMusicaId",
                schema: "identificacao",
                table: "Captacoes",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UsuarioMusicaId",
                schema: "identificacao",
                table: "Captacoes");

            migrationBuilder.RenameColumn(
                name: "UsuarioMusicaNome",
                schema: "identificacao",
                table: "Captacoes",
                newName: "UsuarioDeMusica");
        }
    }
}
