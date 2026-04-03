---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/domain+infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 1.0: Domain + Infra — Entidades, Configurations, Migration, Seed

## Visão Geral

Adicionar `public long Codigo { get; private set; }` nas 4 entidades. Criar 4 sequences PostgreSQL. Configurar `HasDefaultValueSql(nextval)` + `ValueGeneratedOnAdd()` + unique index nas 4 configurations. Migration com sequences + colunas + ajuste de seed (associações 1-7, restart sequence em 8).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddCodigo.cs` (gerado)
- **Modificar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Associacao.cs` — +`public long Codigo { get; private set; }`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Titular.cs` — +idem
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` — +idem
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Fonograma.cs` — +idem
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/AssociacaoConfiguration.cs` — +HasDefaultValueSql, +ValueGeneratedOnAdd, +unique index
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/TitularConfiguration.cs` — +idem
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/ObraMusicalConfiguration.cs` — +idem
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/FonogramaConfiguration.cs` — +idem
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Seeds/AssociacaoSeed.cs` — +Codigo 1-7

## Subtarefas

- [x] 1.1 Adicionar `public long Codigo { get; private set; }` nas 4 entidades
- [x] 1.2 Em cada Configuration: `builder.Property(e => e.Codigo).HasDefaultValueSql("nextval('cadastro.seq_{tabela}_codigo')").ValueGeneratedOnAdd();` + `builder.HasIndex(e => e.Codigo).IsUnique().HasDatabaseName("uq_{tabela}_codigo");`
- [x] 1.3 AssociacaoSeed: adicionar Codigo 1-7 nos registros
- [x] 1.4 Gerar migration. A migration deve incluir:
  - CREATE SEQUENCE cadastro.seq_associacoes_codigo AS BIGINT (START 8 — após seed)
  - CREATE SEQUENCE cadastro.seq_titulares_codigo AS BIGINT START 1
  - CREATE SEQUENCE cadastro.seq_obras_codigo AS BIGINT START 1
  - CREATE SEQUENCE cadastro.seq_fonogramas_codigo AS BIGINT START 1
  - ALTER TABLE + coluna Codigo BIGINT NOT NULL UNIQUE DEFAULT nextval
  - Para associações: os 7 registros do seed já existem, migration deve UPDATE com códigos 1-7
- [x] 1.5 `dotnet ef database update`
- [x] 1.6 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] `dotnet ef database update` executa sem erros
- [x] `SELECT Codigo FROM cadastro.associacoes ORDER BY Codigo` → 1,2,3,4,5,6,7
- [x] `INSERT INTO cadastro.titulares (...) RETURNING "Codigo"` → retorna inteiro > 0
- [x] Unique constraint funciona (tentativa de duplicar Codigo falha)
