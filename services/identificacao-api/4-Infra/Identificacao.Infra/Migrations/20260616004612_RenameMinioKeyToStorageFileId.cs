using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identificacao.Infra.Migrations
{
    /// <inheritdoc />
    public partial class RenameMinioKeyToStorageFileId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "MinioKey",
                schema: "identificacao",
                table: "Uploads",
                newName: "StorageFileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "StorageFileId",
                schema: "identificacao",
                table: "Uploads",
                newName: "MinioKey");
        }
    }
}
