using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Cadastro.Infra.Data.Configurations;

public class AnexoConfiguration : IEntityTypeConfiguration<Anexo>
{
    public void Configure(EntityTypeBuilder<Anexo> builder)
    {
        builder.ToTable("anexos");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.StorageFileId)
            .HasColumnType("VARCHAR(26)")
            .IsRequired();

        builder.Property(a => a.EntidadeTipo)
            .HasConversion(new ValueConverter<TipoEntidadeAnexo, string>(
                v => ToEntidadeString(v), v => ParseEntidade(v)))
            .HasColumnType("VARCHAR(10)")
            .IsRequired();

        builder.Property(a => a.EntidadeId)
            .IsRequired();

        builder.Property(a => a.Categoria)
            .HasConversion(new ValueConverter<CategoriaAnexo, string>(
                v => ToCategoriaString(v), v => ParseCategoria(v)))
            .HasColumnType("VARCHAR(22)")
            .IsRequired();

        builder.Property(a => a.NomeOriginal)
            .HasColumnType("VARCHAR(255)")
            .IsRequired();

        builder.Property(a => a.ContentType)
            .HasColumnType("VARCHAR(100)")
            .IsRequired();

        builder.Property(a => a.TamanhoBytes)
            .IsRequired();

        builder.Property(a => a.StatusScan)
            .HasConversion(new ValueConverter<StatusAnexo, string>(
                v => ToStatusString(v), v => ParseStatus(v)))
            .HasColumnType("VARCHAR(14)")
            .IsRequired();

        builder.Property(a => a.UploadadoPor)
            .HasColumnType("VARCHAR(200)")
            .IsRequired();

        builder.Property(a => a.CriadoEm)
            .IsRequired();

        builder.Property(a => a.ExcluidoEm)
            .IsRequired(false);

        // Unicidade: no máximo um arquivo ativo por (EntidadeId, Categoria)
        builder.HasIndex(a => new { a.EntidadeId, a.Categoria })
            .IsUnique()
            .HasFilter("\"ExcluidoEm\" IS NULL")
            .HasDatabaseName("uq_anexos_entidade_categoria_ativo");

        builder.HasIndex(a => new { a.EntidadeTipo, a.EntidadeId })
            .HasDatabaseName("ix_anexos_entidade");

        builder.HasIndex(a => a.StatusScan)
            .HasFilter("\"ExcluidoEm\" IS NULL")
            .HasDatabaseName("ix_anexos_status_scan_ativo");
    }

    private static string ToEntidadeString(TipoEntidadeAnexo v)
    {
        if (v == TipoEntidadeAnexo.Obra)      return "OBRA";
        if (v == TipoEntidadeAnexo.Fonograma) return "FONOGRAMA";
        if (v == TipoEntidadeAnexo.Titular)   return "TITULAR";
        throw new ArgumentOutOfRangeException(nameof(v));
    }

    private static TipoEntidadeAnexo ParseEntidade(string v)
    {
        if (v == "OBRA")      return TipoEntidadeAnexo.Obra;
        if (v == "FONOGRAMA") return TipoEntidadeAnexo.Fonograma;
        if (v == "TITULAR")   return TipoEntidadeAnexo.Titular;
        throw new ArgumentOutOfRangeException(nameof(v));
    }

    private static string ToCategoriaString(CategoriaAnexo v)
    {
        if (v == CategoriaAnexo.LetraObra)               return "LETRA_OBRA";
        if (v == CategoriaAnexo.OutroDocumentoObra)      return "OUTRO_DOC_OBRA";
        if (v == CategoriaAnexo.AudioFonograma)          return "AUDIO_FONOGRAMA";
        if (v == CategoriaAnexo.OutroDocumentoFonograma) return "OUTRO_DOC_FONOGRAMA";
        if (v == CategoriaAnexo.DocumentoIdentificacao)  return "DOC_IDENTIFICACAO";
        if (v == CategoriaAnexo.Contrato)                return "CONTRATO";
        if (v == CategoriaAnexo.OutroDocumentoTitular)   return "OUTRO_DOC_TITULAR";
        throw new ArgumentOutOfRangeException(nameof(v));
    }

    private static CategoriaAnexo ParseCategoria(string v)
    {
        if (v == "LETRA_OBRA")          return CategoriaAnexo.LetraObra;
        if (v == "OUTRO_DOC_OBRA")      return CategoriaAnexo.OutroDocumentoObra;
        if (v == "AUDIO_FONOGRAMA")     return CategoriaAnexo.AudioFonograma;
        if (v == "OUTRO_DOC_FONOGRAMA") return CategoriaAnexo.OutroDocumentoFonograma;
        if (v == "DOC_IDENTIFICACAO")   return CategoriaAnexo.DocumentoIdentificacao;
        if (v == "CONTRATO")            return CategoriaAnexo.Contrato;
        if (v == "OUTRO_DOC_TITULAR")   return CategoriaAnexo.OutroDocumentoTitular;
        throw new ArgumentOutOfRangeException(nameof(v));
    }

    private static string ToStatusString(StatusAnexo v)
    {
        if (v == StatusAnexo.PendenteScan) return "PENDENTE_SCAN";
        if (v == StatusAnexo.Limpo)        return "LIMPO";
        if (v == StatusAnexo.Infectado)    return "INFECTADO";
        throw new ArgumentOutOfRangeException(nameof(v));
    }

    private static StatusAnexo ParseStatus(string v)
    {
        if (v == "PENDENTE_SCAN") return StatusAnexo.PendenteScan;
        if (v == "LIMPO")         return StatusAnexo.Limpo;
        if (v == "INFECTADO")     return StatusAnexo.Infectado;
        throw new ArgumentOutOfRangeException(nameof(v));
    }
}
