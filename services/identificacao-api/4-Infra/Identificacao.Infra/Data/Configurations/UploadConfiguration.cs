using Identificacao.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identificacao.Infra.Data.Configurations;

public class UploadConfiguration : IEntityTypeConfiguration<Upload>
{
    public void Configure(EntityTypeBuilder<Upload> builder)
    {
        builder.HasKey(u => u.Id);

        builder.HasOne(u => u.Captacao)
            .WithMany()
            .HasForeignKey(u => u.CaptacaoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(u => u.NomeArquivo).HasMaxLength(255).IsRequired();
        builder.Property(u => u.StorageFileId).HasMaxLength(500).IsRequired();
        builder.Property(u => u.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
        
        builder.HasIndex(u => u.CaptacaoId).HasDatabaseName("ix_uploads_captacao");
        builder.HasIndex(u => u.Status)
            .HasFilter("\"Status\" = 'Processando'")
            .HasDatabaseName("ix_uploads_status_processando");
    }
}
