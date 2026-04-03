using Identificacao.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class ErroUploadConfiguration : IEntityTypeConfiguration<ErroUpload>
{
    public void Configure(EntityTypeBuilder<ErroUpload> builder)
    {
        builder.HasKey(e => e.Id);

        builder.HasOne(e => e.Upload)
            .WithMany()
            .HasForeignKey(e => e.UploadId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(e => e.Coluna).HasMaxLength(50).IsRequired();
        builder.Property(e => e.Mensagem).HasMaxLength(500).IsRequired();

        builder.HasIndex(e => e.UploadId).HasDatabaseName("ix_erros_upload");
    }
}
