using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddObras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "obras_musicais",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Subtitulo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Tipo = table.Column<string>(type: "VARCHAR(15)", nullable: false),
                    Genero = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Iswc = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Status = table.Column<string>(type: "VARCHAR(20)", nullable: false),
                    DominioPublico = table.Column<bool>(type: "boolean", nullable: false),
                    ObraDepuradaParaId = table.Column<Guid>(type: "uuid", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_obras_musicais", x => x.Id);
                    table.ForeignKey(
                        name: "FK_obras_musicais_obras_musicais_ObraDepuradaParaId",
                        column: x => x.ObraDepuradaParaId,
                        principalSchema: "cadastro",
                        principalTable: "obras_musicais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_obras_depurada_para",
                schema: "cadastro",
                table: "obras_musicais",
                column: "ObraDepuradaParaId",
                filter: "\"ObraDepuradaParaId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_obras_status",
                schema: "cadastro",
                table: "obras_musicais",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "ix_obras_tipo",
                schema: "cadastro",
                table: "obras_musicais",
                column: "Tipo");

            migrationBuilder.CreateIndex(
                name: "uq_obras_iswc",
                schema: "cadastro",
                table: "obras_musicais",
                column: "Iswc",
                unique: true,
                filter: "\"Iswc\" IS NOT NULL");

            migrationBuilder.Sql(@"
                ALTER TABLE cadastro.obras_musicais ADD CONSTRAINT ck_obras_tipo CHECK (""Tipo"" IN ('MUSICAL', 'LITEROMUSICAL', 'VERSAO', 'POT_POURRI'));
                ALTER TABLE cadastro.obras_musicais ADD CONSTRAINT ck_obras_status CHECK (""Status"" IN ('PENDENTE', 'LIBERADO', 'BLOQUEADO', 'DOMINIO_PUBLICO', 'DEPURADA'));
                
                CREATE EXTENSION IF NOT EXISTS pg_trgm;
                CREATE INDEX ix_obras_titulo ON cadastro.obras_musicais USING gin (""Titulo"" gin_trgm_ops);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "obras_musicais",
                schema: "cadastro");
        }
    }
}
