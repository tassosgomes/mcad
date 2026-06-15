using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Cadastro.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPortalTitular : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bairro",
                schema: "cadastro",
                table: "titulares",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cep",
                schema: "cadastro",
                table: "titulares",
                type: "char(8)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cidade",
                schema: "cadastro",
                table: "titulares",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Complemento",
                schema: "cadastro",
                table: "titulares",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                schema: "cadastro",
                table: "titulares",
                type: "character varying(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Logradouro",
                schema: "cadastro",
                table: "titulares",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Numero",
                schema: "cadastro",
                table: "titulares",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Uf",
                schema: "cadastro",
                table: "titulares",
                type: "char(2)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "credenciais_titular",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TitularId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenhaHash = table.Column<string>(type: "VARCHAR(60)", nullable: false),
                    TentativasFalhas = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    BloqueadoAte = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credenciais_titular", x => x.Id);
                    table.ForeignKey(
                        name: "fk_credenciais_titular_titular",
                        column: x => x.TitularId,
                        principalSchema: "cadastro",
                        principalTable: "titulares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ocorrencias",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TitularId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tipo = table.Column<string>(type: "VARCHAR(30)", nullable: false),
                    ObraId = table.Column<Guid>(type: "uuid", nullable: true),
                    FonogramaId = table.Column<Guid>(type: "uuid", nullable: true),
                    Descricao = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "VARCHAR(20)", nullable: false),
                    Resolucao = table.Column<string>(type: "text", nullable: true),
                    JustificativaCancelamento = table.Column<string>(type: "text", nullable: true),
                    AbertaEm = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    ResolvidaEm = table.Column<DateTime>(type: "timestamptz", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ocorrencias", x => x.Id);
                    table.CheckConstraint("ck_ocorrencias_status", "\"Status\" IN ('ABERTA','EM_ANALISE','RESOLVIDA','CANCELADA')");
                    table.CheckConstraint("ck_ocorrencias_tipo", "\"Tipo\" IN ('TITULARIDADE_DIVERGENTE','FONOGRAMA_INCORRETO','DADO_CADASTRAL','OBRA_AUSENTE')");
                    table.ForeignKey(
                        name: "fk_ocorrencias_titular",
                        column: x => x.TitularId,
                        principalSchema: "cadastro",
                        principalTable: "titulares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "solicitacoes_alteracao",
                schema: "cadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TitularId = table.Column<Guid>(type: "uuid", nullable: false),
                    Campo = table.Column<string>(type: "VARCHAR(15)", nullable: false),
                    ValorAtual = table.Column<string>(type: "text", nullable: false),
                    ValorPretendido = table.Column<string>(type: "text", nullable: false),
                    Justificativa = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "VARCHAR(15)", nullable: false),
                    SolicitadaEm = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    DecisaoPor = table.Column<Guid>(type: "uuid", nullable: true),
                    DecididaEm = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    JustificativaRejeicao = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_solicitacoes_alteracao", x => x.Id);
                    table.CheckConstraint("ck_solicitacoes_alteracao_campo", "\"Campo\" IN ('NOME','CAE_IPI','ASSOCIACAO','CATEGORIA')");
                    table.CheckConstraint("ck_solicitacoes_alteracao_status", "\"Status\" IN ('SOLICITADA','APROVADA','REJEITADA')");
                    table.ForeignKey(
                        name: "fk_solicitacoes_alteracao_titular",
                        column: x => x.TitularId,
                        principalSchema: "cadastro",
                        principalTable: "titulares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "telefones_titular",
                schema: "cadastro",
                columns: table => new
                {
                    TitularId = table.Column<Guid>(type: "uuid", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Tipo = table.Column<string>(type: "VARCHAR(12)", nullable: false),
                    Numero = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_telefones_titular", x => new { x.TitularId, x.Ordem });
                    table.ForeignKey(
                        name: "FK_telefones_titular_titulares_TitularId",
                        column: x => x.TitularId,
                        principalSchema: "cadastro",
                        principalTable: "titulares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "uq_titulares_email",
                schema: "cadastro",
                table: "titulares",
                column: "Email",
                unique: true,
                filter: "\"Email\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "uq_credenciais_titular_titular",
                schema: "cadastro",
                table: "credenciais_titular",
                column: "TitularId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_ocorrencias_titular_status",
                schema: "cadastro",
                table: "ocorrencias",
                columns: new[] { "TitularId", "Status" });

            migrationBuilder.CreateIndex(
                name: "ix_solicitacoes_alteracao_titular_status",
                schema: "cadastro",
                table: "solicitacoes_alteracao",
                columns: new[] { "TitularId", "Status" });

            migrationBuilder.CreateIndex(
                name: "ix_telefones_titular_titular",
                schema: "cadastro",
                table: "telefones_titular",
                column: "TitularId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "credenciais_titular",
                schema: "cadastro");

            migrationBuilder.DropTable(
                name: "ocorrencias",
                schema: "cadastro");

            migrationBuilder.DropTable(
                name: "solicitacoes_alteracao",
                schema: "cadastro");

            migrationBuilder.DropTable(
                name: "telefones_titular",
                schema: "cadastro");

            migrationBuilder.DropIndex(
                name: "uq_titulares_email",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Bairro",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Cep",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Cidade",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Complemento",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Email",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Logradouro",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Numero",
                schema: "cadastro",
                table: "titulares");

            migrationBuilder.DropColumn(
                name: "Uf",
                schema: "cadastro",
                table: "titulares");
        }
    }
}
