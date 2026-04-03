using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddUploadsEErros : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Uploads",
                schema: "identificacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaptacaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomeArquivo = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    MinioKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    TotalLinhas = table.Column<int>(type: "integer", nullable: true),
                    ExecucoesCriadas = table.Column<int>(type: "integer", nullable: true),
                    TotalErros = table.Column<int>(type: "integer", nullable: true),
                    MensagemErro = table.Column<string>(type: "text", nullable: true),
                    AnalistaId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Uploads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Uploads_Captacoes_CaptacaoId",
                        column: x => x.CaptacaoId,
                        principalSchema: "identificacao",
                        principalTable: "Captacoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ErrosUpload",
                schema: "identificacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UploadId = table.Column<Guid>(type: "uuid", nullable: false),
                    Linha = table.Column<int>(type: "integer", nullable: false),
                    Coluna = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Mensagem = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ErrosUpload", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ErrosUpload_Uploads_UploadId",
                        column: x => x.UploadId,
                        principalSchema: "identificacao",
                        principalTable: "Uploads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_erros_upload",
                schema: "identificacao",
                table: "ErrosUpload",
                column: "UploadId");

            migrationBuilder.CreateIndex(
                name: "ix_uploads_captacao",
                schema: "identificacao",
                table: "Uploads",
                column: "CaptacaoId");

            migrationBuilder.CreateIndex(
                name: "ix_uploads_status_processando",
                schema: "identificacao",
                table: "Uploads",
                column: "Status",
                filter: "\"Status\" = 'Processando'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ErrosUpload",
                schema: "identificacao");

            migrationBuilder.DropTable(
                name: "Uploads",
                schema: "identificacao");
        }
    }
}
