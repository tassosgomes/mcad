using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cadastro.Infra.Data.Configurations;

/// <summary>
/// Fluent API configuration para a entidade Titular.
/// Configura HasConversion para VOs (Cpf, Cnpj, CaeIpi), FK para Associacao,
/// unique indexes parciais, e CHECK constraint tipo↔documento.
/// </summary>
public class TitularConfiguration : IEntityTypeConfiguration<Titular>
{
    public void Configure(EntityTypeBuilder<Titular> builder)
    {
        builder.ToTable("titulares");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id)
            .IsRequired();

        builder.Property(t => t.Codigo)
            .HasDefaultValueSql("nextval('cadastro.seq_titulares_codigo')")
            .ValueGeneratedOnAdd();
            
        builder.HasIndex(t => t.Codigo)
            .IsUnique()
            .HasDatabaseName("uq_titulares_codigo");

        builder.Property(t => t.Nome)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(t => t.Tipo)
            .HasConversion(
                v => v.ToString().ToUpperInvariant(),
                v => Enum.Parse<TipoTitular>(v, true))
            .HasColumnType("VARCHAR(2)")
            .IsRequired();

        // Value Object Cpf: persiste Cpf.Valor (string 11 chars)
        builder.Property(t => t.Cpf)
            .HasConversion(
                cpf => cpf != null ? cpf.Valor : null,
                valor => valor != null ? Cpf.Create(valor) : null)
            .HasColumnName("Cpf")
            .HasMaxLength(11)
            .IsRequired(false);

        // Value Object Cnpj: persiste Cnpj.Valor (string 14 chars, uppercase)
        builder.Property(t => t.Cnpj)
            .HasConversion(
                cnpj => cnpj != null ? cnpj.Valor : null,
                valor => valor != null ? Cnpj.Create(valor) : null)
            .HasColumnName("Cnpj")
            .HasMaxLength(14)
            .IsRequired(false);

        builder.Property(t => t.Nacionalidade)
            .HasMaxLength(100)
            .IsRequired();

        // Value Object CaeIpi: persiste CaeIpi.Valor (string 1-20 chars)
        builder.Property(t => t.CaeIpi)
            .HasConversion(
                cae => cae != null ? cae.Valor : null,
                valor => valor != null ? CaeIpi.Create(valor) : null)
            .HasColumnName("CaeIpi")
            .HasMaxLength(20)
            .IsRequired(false);

        builder.Property(t => t.AssociacaoId)
            .IsRequired();

        builder.Property(t => t.Status)
            .HasConversion(
                v => v.ToString().ToUpperInvariant(),
                v => Enum.Parse<StatusTitular>(v, true))
            .HasColumnType("VARCHAR(15)")
            .IsRequired();

        builder.Property(t => t.CriadoEm)
            .IsRequired();

        builder.Property(t => t.AtualizadoEm)
            .IsRequired();

        // Foreign Key → Associacao
        builder.HasOne(t => t.Associacao)
            .WithMany()
            .HasForeignKey(t => t.AssociacaoId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique index parcial no CPF (apenas quando preenchido — PF)
        builder.HasIndex(t => t.Cpf)
            .IsUnique()
            .HasFilter("\"Cpf\" IS NOT NULL")
            .HasDatabaseName("uq_titulares_cpf");

        // Unique index parcial no CNPJ (apenas quando preenchido — PJ)
        builder.HasIndex(t => t.Cnpj)
            .IsUnique()
            .HasFilter("\"Cnpj\" IS NOT NULL")
            .HasDatabaseName("uq_titulares_cnpj");

        // Index na AssociacaoId para filtro de associação
        builder.HasIndex(t => t.AssociacaoId)
            .HasDatabaseName("ix_titulares_associacao");

        // Index no Status para filtro de status
        builder.HasIndex(t => t.Status)
            .HasDatabaseName("ix_titulares_status");

        // ─── Extensão Portal do Titular (RF-09) ────────────────────────────────
        // Email: VO com HasConversion (string ↔ Email.Create)
        builder.Property(t => t.Email)
            .HasConversion(
                email => email != null ? email.Valor : null,
                valor => valor != null ? Email.Create(valor) : null)
            .HasColumnName("Email")
            .HasMaxLength(254)
            .IsRequired(false);

        builder.HasIndex(t => t.Email)
            .IsUnique()
            .HasFilter("\"Email\" IS NOT NULL")
            .HasDatabaseName("uq_titulares_email");

        // Endereco: VO estruturado (OwnsOne) — colunas inline em titulares (todas nullable como grupo)
        builder.OwnsOne(t => t.Endereco, nav =>
        {
            nav.Property(e => e.Cep)
                .HasConversion(
                    c => c != null ? c.Valor : null,
                    v => v != null ? Cep.Create(v) : null)
                .HasColumnName("Cep")
                .HasColumnType("char(8)")
                .IsRequired(false);

            nav.Property(e => e.Uf)
                .HasConversion(
                    u => u != null ? u.Valor : null,
                    v => v != null ? Uf.Create(v) : null)
                .HasColumnName("Uf")
                .HasColumnType("char(2)")
                .IsRequired(false);

            nav.Property(e => e.Logradouro)
                .HasColumnName("Logradouro")
                .HasMaxLength(150)
                .IsRequired(false);

            nav.Property(e => e.Numero)
                .HasColumnName("Numero")
                .HasMaxLength(20)
                .IsRequired(false);

            nav.Property(e => e.Complemento)
                .HasColumnName("Complemento")
                .HasMaxLength(150)
                .IsRequired(false);

            nav.Property(e => e.Bairro)
                .HasColumnName("Bairro")
                .HasMaxLength(150)
                .IsRequired(false);

            nav.Property(e => e.Cidade)
                .HasColumnName("Cidade")
                .HasMaxLength(150)
                .IsRequired(false);
        });

        // Telefones: coleção (OwnsMany) — tabela telefones_titular (titular_id, tipo, numero, ordem)
        builder.OwnsMany(t => t.Telefones, nav =>
        {
            nav.ToTable("telefones_titular");

            // Shadow property Ordem — posição do telefone na coleção do titular
            nav.Property<int>("Ordem");

            // PK composta (TitularId, Ordem) — Ordem preserva a posição na lista
            nav.HasKey("TitularId", "Ordem");

            nav.Property(t => t.Tipo)
                .HasConversion(
                    v => v.ToString().ToUpperInvariant(),
                    v => Enum.Parse<TipoTelefone>(v, true))
                .HasColumnName("Tipo")
                .HasColumnType("VARCHAR(12)")
                .IsRequired();

            // Numero é VO Telefone (record com Create factory)
            nav.Property(t => t.Numero)
                .HasConversion(
                    n => n.Valor,
                    v => Telefone.Create(v))
                .HasColumnName("Numero")
                .HasMaxLength(11)
                .IsRequired();

            nav.HasIndex("TitularId")
                .HasDatabaseName("ix_telefones_titular_titular");
        });

        // NOTE: CHECK constraints e GIN trigram index são adicionados manualmente na migration
        // via MigrationBuilder.Sql() — EF Core não suporta CHECK constraints e GIN natively
    }
}
