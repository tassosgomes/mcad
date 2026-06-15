---
status: pending
parallelizable: false
blocked_by: ["1.0", "2.0"]
---

<task_context>
<domain>cadastro/infra</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0", "5.0", "6.0", "7.0", "8.0", "9.0"</unblocks>
</task_context>

# Tarefa 3.0: Configurações EF Core e Migration `AddPortalTitular`

## Visão Geral

Mapear as 3 novas entidades e a extensão de `Titular` no EF Core (configs `IEntityTypeConfiguration<T>`), registrar os DbSets no `CadastroDbContext` e gerar a migration `AddPortalTitular` que cria as tabelas `credenciais_titular`, `ocorrencias`, `solicitacoes_alteracao`, `telefones_titular` e adiciona as colunas de endereço/email em `titulares`.

## Requisitos

- Tech Spec — seção *Modelos de Dados* (estrutura de tabelas), *Extensão de Titular* (`OwnsOne`/`OwnsMany`)
- Schema-per-Service (tudo no schema `cadastro`)

## Subtarefas

- [ ] 3.1 Criar `4-Infra/Cadastro.Infra/Data/Configurations/CredencialTitularConfiguration.cs` — tabela `credenciais_titular`, PK `Id`, coluna `TitularId` UNIQUE com FK → `titulares` `ON DELETE CASCADE`, `SenhaHash` varchar(60), `TentativasFalhas` int default 0, `BloqueadoAte` timestamptz nullable, timestamps. Conversions de enum conforme padrão (`ToString().ToUpperInvariant()`).
- [ ] 3.2 Criar `4-Infra/Cadastro.Infra/Data/Configurations/OcorrenciaConfiguration.cs` — tabela `ocorrencias`, FK `TitularId` → `titulares` `ON DELETE RESTRICT`, enums `Tipo`/`Status` como VARCHAR com CHECK constraint `Status IN (...)`, `ObraId?`/`FonogramaId?` nullable (sem FK — referência fraca), índice em `(TitularId, Status)`.
- [ ] 3.3 Criar `4-Infra/Cadastro.Infra/Data/Configurations/SolicitacaoAlteracaoConfiguration.cs` — tabela `solicitacoes_alteracao`, FK `TitularId`, enums `Campo`/`Status`, índice em `(TitularId, Status)`.
- [ ] 3.4 Atualizar `4-Infra/Cadastro.Infra/Data/Configurations/TitularConfiguration.cs` — adicionar:
  - Coluna `Email` com `HasConversion(email => email?.Valor, valor => valor != null ? Email.Create(valor) : null)`.
  - `OwnsOne(t => t.Endereco, ...)` com colunas `Cep, Logradouro, Numero, Complemento, Bairro, Cidade, Uf` (todas nullable como grupo). Conversão de `Cep` e `Uf` via `HasConversion`.
  - `OwnsMany(t => t.Telefones, b => { b.ToTable("telefones_titular"); b.Property(...).HasConversion(...); b.HasIndex("TitularId"); })` com coluna `Ordem` para preservar ordem.
- [ ] 3.5 Registrar DbSets no `CadastroDbContext`: `DbSet<CredencialTitular> CredenciaisTitular`, `DbSet<Ocorrencia> Ocorrencias`, `DbSet<SolicitacaoAlteracao> SolicitacoesAlteracao`. Adicionar `ApplyConfiguration` para as 3 novas configs no `OnModelCreating`.
- [ ] 3.6 Gerar a migration: `dotnet ef migrations add AddPortalTitular --project 4-Infra/Cadastro.Infra --startup-project 1-Services/Cadastro.API`. Validar o `Up()`: cria 3 tabelas + `telefones_titular` + `ALTER TABLE titulares ADD` colunas de contato.
- [ ] 3.7 Atualizar o `CadastroDbContextModelSnapshot.cs` (gerado automaticamente pelo comando `migrations add`).
- [ ] 3.8 Implementar os repositórios em `4-Infra/Cadastro.Infra/Repositories/`: `CredencialTitularRepository.cs`, `OcorrenciaRepository.cs`, `SolicitacaoAlteracaoRepository.cs` — espelhar `TitularRepository.cs` (usam `CadastroDbContext`, aplicam filtro, `SaveChangesAsync`). `ByDocumentoAsync` da credencial deve fazer JOIN com `Titulares` para filtrar por CPF/CNPJ.

## Sequenciamento

- Bloqueado por: 1.0, 2.0 (entidades e VOs devem existir)
- Desbloqueia: 4.0, 5.0, 6.0, 7.0, 8.0, 9.0 (todas as tarefas que persistem dados)
- Paralelizável: Não (tarefa de integração central)

## Detalhes de Implementação

**Padrão de config** (de `TitularConfiguration.cs`):

```csharp
public class TitularConfiguration : IEntityTypeConfiguration<Titular>
{
    public void Configure(EntityTypeBuilder<Titular> builder)
    {
        builder.ToTable("titulares");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Cpf)
            .HasConversion(c => c != null ? c.Valor : null, v => v != null ? Cpf.Create(v) : null)
            .HasColumnType("varchar(11)");
        // ...
    }
}
```

**Conversão de enum** (padrão existente):

```csharp
builder.Property(o => o.Status)
    .HasConversion(v => v.ToString().ToUpperInvariant(), v => Enum.Parse<StatusOcorrencia>(v, true))
    .HasColumnType("varchar(20)");
builder.ToTable("ocorrencias", b => b.HasCheckConstraint("ck_ocorrencias_status",
    "\"Status\" IN ('ABERTA','EM_ANALISE','RESOLVIDA','CANCELADA')"));
```

**`OwnsOne` para Endereco** (primeiro uso no codebase — a Tech Spec autoriza explicitamente):

```csharp
builder.OwnsOne(t => t.Endereco, nav =>
{
    nav.Property(e => e.Cep).HasConversion(c => c.Valor, v => Cep.Create(v)).HasColumnType("char(8)");
    nav.Property(e => e.Uf).HasConversion(u => u.Valor, v => Uf.Create(v)).HasColumnType("char(2)");
    nav.Property(e => e.Logradouro).HasColumnType("varchar(200)");
    // ... demais colunas
});
```

**Nota sobre `ByDocumentoAsync`:** a credencial não armazena o documento — o documento está no `Titular` (VO `Cpf`/`Cnpj`). O repositório deve fazer `Join` com `Titulares` ou o handler normaliza o documento e busca o titular primeiro. Alinhar com a decisão na tarefa 5.0 (login handler).

## Critérios de Sucesso

- `dotnet ef migrations add AddPortalTitular` gera a migration sem erros.
- `dotnet ef database update` (ou `context.Database.Migrate()` no startup) cria as 4 tabelas + altera `titulares`.
- As 3 entidades são persistíveis e consultáveis via repositório em teste de integração simples.
- `dotnet build` no solution passa.
