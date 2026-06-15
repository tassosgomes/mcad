# Task Review — Tarefa 3.0: Configurações EF Core e Migration `AddPortalTitular`

> **PRD:** `tasks/cadastro/prd-acesso-titulares/prd.md`
> **Task:** `tasks/cadastro/prd-acesso-titulares/03_task.md`
> **Tech Spec:** `tasks/cadastro/prd-acesso-titulares/techspec.md`
> **Data:** 2026-06-15
> **Branch:** `feature/prd-acesso-titulares`
> **Iteração:** 2 (revalidação após REPROVADA na iter 1)
> **Recomendação Final:** **APROVADA**

---

## Resumo da Iteração

A **iter 1** reprovou por 1 blocker funcional: as conversões de enum (`HasConversion`) em `OcorrenciaConfiguration.cs` e `SolicitacaoAlteracaoConfiguration.cs` usavam `v.ToString().ToUpperInvariant()` ingênuo, produzindo tokens sem underscore (`EMANALISE`, `TITULARIDADEDIVERGENTE`, `CAEIPI`) que NÃO casavam com as CHECK constraints na migration (`'EM_ANALISE'`, `'TITULARIDADE_DIVERGENTE'`, `'CAE_IPI'`) — qualquer INSERT/UPDATE que tocasse esses valores seria rejeitado pelo PostgreSQL em runtime.

O implementer aplicou **exatamente** as 3 correções pontuais especificadas no feedback da iter 1:
1. `OcorrenciaConfiguration.cs` — `Tipo`: mapeamento ternário explícito para os 4 valores multi-palavra (`TITULARIDADE_DIVERGENTE`, `FONOGRAMA_INCORRETO`, `DADO_CADASTRAL`, `OBRA_AUSENTE`), ambas as direções.
2. `OcorrenciaConfiguration.cs` — `Status`: `EmAnalise` → `'EM_ANALISE'`.
3. `SolicitacaoAlteracaoConfiguration.cs` — `Campo`: `CaeIpi` → `'CAE_IPI'`.

A migration **NÃO foi regenerada** — decisão correta, pois as CHECK constraints já estavam corretas no SQL da iter 1; apenas as lambdas de conversão no config estavam erradas. O `ModelSnapshot` e a migration `Up()`/`Down()` permanecem válidos.

---

## 1. Resultado da Validação Automatizada (iter 2)

| Etapa | Comando | Resultado |
|---|---|---|
| Build | `dotnet build services/cadastro-api/Cadastro.sln` | **PASS** — `Build succeeded. 0 Error(s)`. 2 warnings (NU1902 OpenTelemetry vuln, pré-existentes). |
| Unit tests | `dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests --no-build` | **PASS** — `Failed: 0, Passed: 249, Skipped: 0, Total: 249` (0 regressões vs baseline). |
| Migration list | `dotnet ef migrations list --project 4-Infra/Cadastro.Infra --startup-project 1-Services/Cadastro.API --no-build` | **PASS** — `20260615010120_AddPortalTitular` listado como última migration (14 no total); modelo EF construído in-process sem erro. Aviso `EF20606` (Endereco optional dependent) pré-existente e aceitável (tech spec autoriza "todas nullable como grupo"). |
| `[NotMapped]` ausente em `Titular.cs` | `rg "NotMapped\|System.ComponentModel.DataAnnotations.Schema"` | **PASS** — 0 ocorrências (exit 1). Confirmação do bridge transitório da task 2.0 removido. |
| Integração (Testcontainers) | **NÃO EXECUTADO** | Pulado por instruções do orquestrador (sem PostgreSQL disponível). |

### Comandos executados

```bash
dotnet build services/cadastro-api/Cadastro.sln -nologo
dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests --nologo --no-build
dotnet ef migrations list --project services/cadastro-api/4-Infra/Cadastro.Infra \
  --startup-project services/cadastro-api/1-Services/Cadastro.API --no-build
rg -n "NotMapped|System.ComponentModel.DataAnnotations.Schema" \
  services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Titular.cs
```

---

## 2. Token-Match Verification (CRÍTICO — foco da iter 2)

Comparações token-a-token entre `HasConversion` (to-db e from-db) nos configs e os tokens literais nas CHECK constraints da migration `20260615010120_AddPortalTitular.cs`.

### `OcorrenciaConfiguration.Tipo` ↔ `ck_ocorrencias_tipo`

| Enum value | to-db lambda | from-db lambda | CHECK constraint token | Match? |
|---|---|---|---|---|
| `TitularidadeDivergente` | `"TITULARIDADE_DIVERGENTE"` | `"TITULARIDADE_DIVERGENTE"` → enum | `'TITULARIDADE_DIVERGENTE'` | **SIM** |
| `FonogramaIncorreto` | `"FONOGRAMA_INCORRETO"` | `"FONOGRAMA_INCORRETO"` → enum | `'FONOGRAMA_INCORRETO'` | **SIM** |
| `DadoCadastral` | `"DADO_CADASTRAL"` | `"DADO_CADASTRAL"` → enum | `'DADO_CADASTRAL'` | **SIM** |
| `ObraAusente` | `"OBRA_AUSENTE"` | `"OBRA_AUSENTE"` → enum | `'OBRA_AUSENTE'` | **SIM** |

Evidência: `OcorrenciaConfiguration.cs:39-48`, migration `:123`.

### `OcorrenciaConfiguration.Status` ↔ `ck_ocorrencias_status`

| Enum value | to-db lambda | from-db lambda | CHECK constraint token | Match? |
|---|---|---|---|---|
| `Aberta` | (fallback) `"ABERTA"` | `Enum.Parse(v, true)` | `'ABERTA'` | **SIM** |
| `EmAnalise` | `"EM_ANALISE"` | `"EM_ANALISE"` → enum | `'EM_ANALISE'` | **SIM** |
| `Resolvida` | (fallback) `"RESOLVIDA"` | `Enum.Parse(v, true)` | `'RESOLVIDA'` | **SIM** |
| `Cancelada` | (fallback) `"CANCELADA"` | `Enum.Parse(v, true)` | `'CANCELADA'` | **SIM** |

Evidência: `OcorrenciaConfiguration.cs:67-70`, migration `:122`.

### `SolicitacaoAlteracaoConfiguration.Campo` ↔ `ck_solicitacoes_alteracao_campo`

| Enum value | to-db lambda | from-db lambda | CHECK constraint token | Match? |
|---|---|---|---|---|
| `Nome` | (fallback) `"NOME"` | `Enum.Parse(v, true)` | `'NOME'` | **SIM** |
| `CaeIpi` | `"CAE_IPI"` | `"CAE_IPI"` → enum | `'CAE_IPI'` | **SIM** |
| `Associacao` | (fallback) `"ASSOCIACAO"` | `Enum.Parse(v, true)` | `'ASSOCIACAO'` | **SIM** |
| `Categoria` | (fallback) `"CATEGORIA"` | `Enum.Parse(v, true)` | `'CATEGORIA'` | **SIM** |

Evidência: `SolicitacaoAlteracaoConfiguration.cs:38-41`, migration `:153`.

### `SolicitacaoAlteracaoConfiguration.Status` ↔ `ck_solicitacoes_alteracao_status`

| Enum value | to-db lambda | from-db lambda | CHECK constraint token | Match? |
|---|---|---|---|---|
| `Solicitada` | (fallback) `"SOLICITADA"` | `Enum.Parse(v, true)` | `'SOLICITADA'` | **SIM** |
| `Aprovada` | (fallback) `"APROVADA"` | `Enum.Parse(v, true)` | `'APROVADA'` | **SIM** |
| `Rejeitada` | (fallback) `"REJEITADA"` | `Enum.Parse(v, true)` | `'REJEITADA'` | **SIM** |

Evidência: `SolicitacaoAlteracaoConfiguration.cs:58-60`, migration `:154`. Todos single-word — `ToString().ToUpperInvariant()` é correto.

### Round-trip safety

**OK** — todas as conversões são simétricas e sem colisões:
- Cada enum value mapeia para um token único (fallback `.ToString().ToUpperInvariant()` nunca produz um token já coberto pelos branches explícitos).
- Cada token mapeia de volta ao enum original (`Enum.Parse(v, true)` aceita os tokens com underscore).
- Os branches ternários cobrem exatamente os valores multi-palavra; os single-word passam pelo fallback.

---

## 3. Revisão Técnica

### Conformidade com PRD + Tech Spec + Task

| Requisito | Status | Evidência |
|---|---|---|
| 3.1 `credenciais_titular`, PK `Id`, `TitularId` UNIQUE, FK CASCADE, `SenhaHash` varchar(60), `TentativasFalhas` int default 0, `BloqueadoAte` timestamptz nullable, timestamps | **OK** | `CredencialTitularConfiguration.cs` + migration `:77-100` |
| 3.2 `ocorrencias`, FK RESTRICT, enums com CHECK, `ObraId?/FonogramaId?` nullable sem FK, índice `(TitularId, Status)` | **OK** | `OcorrenciaConfiguration.cs` + migration `:102-131`. **Enums agora casam com CHECK (resolvido na iter 2).** |
| 3.3 `solicitacoes_alteracao`, FK, enums, índice `(TitularId, Status)` | **OK** | `SolicitacaoAlteracaoConfiguration.cs` + migration `:133-162`. **`Campo.CaeIpi` agora casa com CHECK (resolvido na iter 2).** |
| 3.4 `TitularConfiguration` — Email `HasConversion`, `OwnsOne(Endereco)`, `OwnsMany(Telefones)` com `Ordem` e `HasIndex("TitularId")` | **OK** | `TitularConfiguration.cs:118-207` |
| 3.5 3 DbSets + 3 `ApplyConfiguration` no `DbContext` | **OK** | `CadastroDbContext.cs:24-26` (DbSets), `:48-50` (ApplyConfiguration) |
| 3.6 Migration `AddPortalTitular` cria 3 tabelas + `telefones_titular` + `ALTER TABLE titulares ADD` colunas | **OK** | Migration `Up()` cria 4 tabelas + 8 colunas + 5 índices |
| 3.7 `ModelSnapshot.cs` atualizado | **OK** | Auto-gerado |
| 3.8 3 repositórios espelhando `TitularRepository`; `ByDocumentoAsync` faz JOIN com Titulares | **OK** | `CredencialTitularRepository.ByDocumentoAsync` usa `SqlQuery<Guid>` com `WHERE "Cpf" = {doc} OR "Cnpj" = {doc}` |

### Correctness checks específicos

| Check | Resultado |
|---|---|
| FK `credenciais_titular CASCADE` | **OK** — `DeleteBehavior.Cascade` no config + `ReferentialAction.Cascade` na migration |
| FK `ocorrencias RESTRICT` | **OK** — `DeleteBehavior.Restrict` no config + `ReferentialAction.Restrict` na migration |
| FK `solicitacoes_alteracao RESTRICT` | **OK** — idem |
| FK `telefones_titular CASCADE` | **OK** — `ReferentialAction.Cascade` na migration |
| OwnsMany Telefones: PK inclui `Ordem`, `HasIndex("TitularId")`, conversions Tipo/Numero | **OK** — `TitularConfiguration.cs:178-207`. PK composta `(TitularId, Ordem)` via `nav.HasKey("TitularId", "Ordem")` |
| Migration `Up()`/`Down()` simétricos | **OK** — `Down()` remove as 4 tabelas, o índice `uq_titulares_email` e as 8 colunas adicionadas |
| Fluent API only (sem data annotations) | **OK** — zero `[Column]`, `[Table]`, `[NotMapped]` nas configs e em `Titular.cs` |
| CHECK constraints match enum values | **OK** — token-a-token, ambas as direções (ver seção 2) |
| Schema-per-service (`cadastro`) | **OK** — `HasDefaultSchema("cadastro")` + todas as tabelas/usos qualificados com `schema: "cadastro"` na migration |
| DI registration no `Program.cs` | **OK** — `Program.cs:92-94` registra os 3 repositórios novos |

### Conformidade com Skills aplicadas

| Skill | Conformidade |
|---|---|
| `dotnet-architecture` | Clean Architecture respeitada: configs no `4-Infra`, entidades no `3-Domain`, repositórios implementam interfaces do `3-Domain`. `IEntityTypeConfiguration<T>` em todas as 3 entidades novas. |
| `dotnet-dependency-config` | EF Core + Npgsql, `HasDefaultSchema("cadastro")`, Fluent API only, `AddScoped` para repositórios. Schema-per-Service mantido. |
| `dotnet-code-quality` | PascalCase em configs/repos, XML docs, async + `CancellationToken` em repositórios, `AsNoTracking()` em queries de leitura. Naming consistente com `TitularRepository`. |

### Non-issues (verificadas e descartadas)

- **`Down()` simétrico**: confirmado — remove todas as 4 tabelas, o índice `uq_titulares_email` e as 8 colunas.
- **`CredencialTitularRepository.ByDocumentoAsync`**: usa `SqlQuery<Guid>` em vez de LINQ join — justificado pelo mesmo motivo que `TitularRepository.ExisteDocumentoAsync` (VO `HasConversion` não traduz em LINQ). Sentinela `Guid.Empty` para "não encontrado" é válida (PKs sempre geradas via `Guid.NewGuid()`).
- **`EF20606` (optional dependent `Endereco`)**: aceitável — tech spec autoriza "todas nullable como grupo".
- **Warnings `CS8603` no `OwnsOne(Endereco)`**: pré-existentes do padrão `Cep.Create`/`Uf.Create` nullable — mesmo padrão de `Cpf.Create`/`Cnpj.Create` no mesmo arquivo.

---

## 4. Recomendação Final

### **APROVADA**

O blocker da iter 1 (CHECK constraints incompatíveis com serialização de enum) foi **resolvido** com correções pontuais e exatas, sem regressões. Os 3 enums afetados (`Tipo`, `Status`, `Campo`) agora produzem tokens que casam token-a-token com as CHECK constraints, em ambas as direções. Todos os itens aprovados na iter 1 permanecem íntegros. A migration não foi regenerada (decisão correta — SQL já estava certo).

### Critérios de sucesso do `03_task.md`

- ✅ `dotnet ef migrations add AddPortalTitular` gera a migration sem erros (já existente e válida).
- ✅ As 3 entidades são persistíveis e consultáveis via repositório (token-match garante que INSERT/UPDATE não violará CHECK em runtime).
- ✅ `dotnet build` no solution passa (0 erros).

---

## 5. Telemetry Summary

- **Iterações até estabilização:** 2
- **Defeito principal (iter 1):** Violação de padrão arquitetural (enum→DB string mismatch com CHECK constraint).
- **Correção (iter 2):** Mapeamento ternário explícito para os 4 valores multi-palavra de `Tipo`, `EmAnalise` de `Status`, e `CaeIpi` de `Campo`.
- **Origem provável do defeito:** Task (exemplo de código na seção "Detalhes de Implementação" do `03_task.md` codifica o padrão errado) + lacuna na TechSpec (não referencia o padrão existente em `FonogramaConfiguration`/`ParticipacaoConexaConfiguration`).
- **Indicador estrutural:** Exemplo de código no task file contradiz o codebase real; testes unitários não cobrem camada de persistência. Sugere adicionar pelo menos 1 smoke test de integração por task que toque DB.

Registro completo em: `docs/ai-dev/quality-ledger.md` (entradas para task 3.0 iter 1 e iter 2).
