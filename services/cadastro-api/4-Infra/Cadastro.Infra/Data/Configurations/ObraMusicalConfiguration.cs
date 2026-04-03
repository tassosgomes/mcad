using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

public class ObraMusicalConfiguration : IEntityTypeConfiguration<ObraMusical>
{
    public void Configure(EntityTypeBuilder<ObraMusical> builder)
    {
        // table is configured below with constraint

        builder.HasKey(o => o.Id);

        builder.Property(o => o.Id)
            .IsRequired();

        builder.Property(o => o.Codigo)
            .HasDefaultValueSql("nextval('cadastro.seq_obras_codigo')")
            .ValueGeneratedOnAdd();
            
        builder.HasIndex(o => o.Codigo)
            .IsUnique()
            .HasDatabaseName("uq_obras_codigo");

        builder.Property(o => o.Titulo)
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(o => o.Subtitulo)
            .HasMaxLength(300)
            .IsRequired(false);

        builder.Property(o => o.Tipo)
            .HasConversion(
                v => v == TipoObra.PotPourri ? "POT_POURRI" : v.ToString().ToUpperInvariant(),
                v => v == "POT_POURRI" ? TipoObra.PotPourri : Enum.Parse<TipoObra>(v, true))
            .HasColumnType("VARCHAR(15)")
            .IsRequired();

        builder.Property(o => o.Genero)
            .HasMaxLength(100)
            .IsRequired(false);

        builder.Property(o => o.Iswc)
            .HasMaxLength(20)
            .IsRequired(false);

        builder.Property(o => o.BloqueioJustificativa)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.Property(o => o.Status)
            .HasConversion(
                v => v == StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : v.ToString().ToUpperInvariant(),
                v => v == "DOMINIO_PUBLICO" ? StatusObra.DominioPublico : Enum.Parse<StatusObra>(v, true))
            .HasColumnType("VARCHAR(20)")
            .IsRequired();
            
        // Validar constraint do banco de dados (Check constraint) não está aqui explicitamente, 
        // mas seria bom adicionar se existir no schema. No schema do PRD tem `ck_obras_status`
        // Não vimos a declaração da tabela com check constraints aqui antes para Obra (diferente do Fonograma) mas posso add
        builder.ToTable("obras_musicais", tb =>
        {
            tb.HasCheckConstraint("ck_obras_status", "\"Status\" IN ('PENDENTE', 'LIBERADO', 'BLOQUEADO', 'DOMINIO_PUBLICO', 'DEPURADA')");
        });

        builder.Property(o => o.DominioPublico)
            .IsRequired();

        builder.Property(o => o.ObraDepuradaParaId)
            .IsRequired(false);

        builder.Property(o => o.CriadoEm)
            .IsRequired();

        builder.Property(o => o.AtualizadoEm)
            .IsRequired();

        builder.HasOne(o => o.ObraDepuradaPara)
            .WithMany()
            .HasForeignKey(o => o.ObraDepuradaParaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(o => o.Iswc)
            .IsUnique()
            .HasFilter("\"Iswc\" IS NOT NULL")
            .HasDatabaseName("uq_obras_iswc");

        builder.HasIndex(o => o.Tipo)
            .HasDatabaseName("ix_obras_tipo");

        builder.HasIndex(o => o.Status)
            .HasDatabaseName("ix_obras_status");

        builder.HasIndex(o => o.ObraDepuradaParaId)
            .HasFilter("\"ObraDepuradaParaId\" IS NOT NULL")
            .HasDatabaseName("ix_obras_depurada_para");
    }
}
