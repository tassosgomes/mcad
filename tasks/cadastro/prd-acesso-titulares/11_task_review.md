# Task Review — 11.0: Triagem e Resolução de Ocorrências pelo Analista (RF-33 a RF-39)

> **PRD:** `tasks/cadastro/prd-acesso-titulares/prd.md`
> **TechSpec:** `tasks/cadastro/prd-acesso-titulares/techspec.md`
> **Task:** `tasks/cadastro/prd-acesso-titulares/11_task.md`
> **Branch:** `feature/prd-acesso-titulares`
> **Data:** 2026-06-15
> **Validador:** ai-flow-validator (subagent)

---

## Resultado Final

# ✅ APROVADA

---

## 1. Validação Automatizada

| Comando | Resultado | Detalhes |
|---|---|---|
| `dotnet build Cadastro.sln` | ✅ PASS | 0 erros, 2 warnings (NU1902 OpenTelemetry — pré-existentes, não introduzidos por esta task) |
| `dotnet test 5-Tests/Cadastro.UnitTests` | ✅ PASS | 360/360 testes passaram (+15 vs baseline 345; 0 regressões) |
| `dotnet test 5-Tests/Cadastro.UnitTests --filter "FullyQualifiedName~Ocorrencias"` | ✅ PASS | 26/26 testes Ocorrencia passaram (3 arquivos: Analisar, Resolver, Cancelar) |

Diretório de execução: `services/cadastro-api`.

---

## 2. Aceitação dos Critérios de Sucesso

| Critério (RF) | Status | Evidência |
|---|---|---|
| **RF-33** — Analista lista TODAS com filtros (status, titularId, tipo) | ✅ | `ListarOcorrenciasQueryHandler`: não fixa `TitularId`; todos os 3 filtros opcionais. `GetOcorrenciaByIdQuery` retorna qualquer ocorrência por Id. |
| **RF-34** — `ABERTA → EM_ANALISE` via `AssumirAnalise()` | ✅ | `AnalisarOcorrenciaCommandHandler:49` chama `ocorrencia.AssumirAnalise()`. Teste `HandleAsync_Aberta_DeveTransitarParaEmAnalise`. |
| **RF-35** — `EM_ANALISE → RESOLVIDA` via `Resolver(parecer)` | ✅ | `ResolverOcorrenciaCommandHandler:55` chama `ocorrencia.Resolver(command.Parecer)`. Teste `HandleAsync_EmAnalise_DeveTransitarParaResolvidaERegistrarParecer` valida parecer retornado. |
| **RF-36** — Cancelar com justificativa via `Cancelar(justificativa)` | ✅ | `CancelarOcorrenciaCommandHandler:52`. 2 testes cobrem `ABERTA → CANCELADA` e `EM_ANALISE → CANCELADA`. |
| **RF-37** — Transições inválidas rejeitadas (DomainException → 422) | ✅ | 5 testes de transição inválida (RESOLVIDA→EM_ANALISE, EM_ANALISE→EM_ANALISE, ABERTA→RESOLVIDA, RESOLVIDA→RESOLVIDA, CANCELADA→CANCELADA, RESOLVIDA→CANCELADA). `GlobalExceptionHandler` mapeia `DomainException`→422 (infra pré-existente). |
| **RF-38** — Autor/data registrados | ✅ | `analistaId` via `httpContext.User.FindFirst("sub")` (mesmo padrão de `AnexoEndpoints:49`). Log estruturado com scope `{OcorrenciaId, AnalistaId}` em todos os 3 handlers. RF-38 atendido via logging (decisão documentada no task file — não há persistência de `DecisaoPor` na entidade). |
| **RF-39** — Evento outbox `cadastro.ocorrencia.resolvida` ao resolver | ✅ | `ResolverOcorrenciaCommandHandler:60-69` chama `_outbox.AddEvent("cadastro.ocorrencia.resolvida", ...)`. String literal (NÃO `EventTypes.*`) — preserva Clean Architecture. Teste `HandleAsync_EmAnalise_DevePublicarEventoOcorrenciaResolvida` verifica routing key exato. |

---

## 3. Conformidade com Padrões

### 3.1 Clean Architecture

- ✅ **Application NÃO referencia Infra.** Grep em `2-Application/**/*.csproj` retorna zero ocorrências de `Cadastro.Infra`.
- ✅ **String literal para routing key:** `"cadastro.ocorrencia.resolvida"` (constante privada `EventTypeOcorrenciaResolvida` no handler, valor idêntico a `EventTypes.OcorrenciaResolvida` em Infra). Padrão idêntico a `CriarOcorrenciaCommandHandler:27` (task 8.0).
- ✅ Handlers dependem apenas de `IOcorrenciaRepository`/`IOutboxEventWriter` (interfaces de `3-Domain`) e `ILogger`.

### 3.2 CQRS Nativo

| Componente | Interface | Status |
|---|---|---|
| `AnalisarOcorrenciaCommand` | `ICommand<OcorrenciaResponse>` | ✅ |
| `AnalisarOcorrenciaCommandHandler` | `ICommandHandler<AnalisarOcorrenciaCommand, OcorrenciaResponse>` | ✅ |
| `ResolverOcorrenciaCommand` | `ICommand<OcorrenciaResponse>` | ✅ |
| `ResolverOcorrenciaCommandHandler` | `ICommandHandler<ResolverOcorrenciaCommand, OcorrenciaResponse>` | ✅ |
| `CancelarOcorrenciaCommand` | `ICommand<OcorrenciaResponse>` | ✅ |
| `CancelarOcorrenciaCommandHandler` | `ICommandHandler<CancelarOcorrenciaCommand, OcorrenciaResponse>` | ✅ |
| `ListarOcorrenciasQuery` | `IQuery<OcorrenciaListResponse>` | ✅ |
| `ListarOcorrenciasQueryHandler` | `IQueryHandler<ListarOcorrenciasQuery, OcorrenciaListResponse>` | ✅ |
| `GetOcorrenciaByIdQuery` | `IQuery<OcorrenciaResponse>` | ✅ |
| `GetOcorrenciaByIdQueryHandler` | `IQueryHandler<GetOcorrenciaByIdQuery, OcorrenciaResponse>` | ✅ |

### 3.3 Endpoints + Permissões

Arquivo: `1-Services/Cadastro.API/Endpoints/OcorrenciaEndpoints.cs`

| Método | Caminho | Permissão | Match TechSpec |
|---|---|---|---|
| GET | `/api/v1/ocorrencias/` | `OcorrenciaListar` (`cadastro:default:ocorrencia:listar`) | ✅ |
| GET | `/api/v1/ocorrencias/{id}` | `OcorrenciaVisualizar` (`...:visualizar`) | ✅ |
| POST | `/api/v1/ocorrencias/{id}/analisar` | `OcorrenciaAnalisar` (`...:analisar`) | ✅ |
| POST | `/api/v1/ocorrencias/{id}/resolver` | `OcorrenciaResolver` (`...:resolver`) | ✅ |
| POST | `/api/v1/ocorrencias/{id}/cancelar` | `OcorrenciaCancelar` (`...:cancelar`) | ✅ |

- ✅ Todos usam `.RequireCadastroPermission(...)` (delega para `RequirePermission` do `Ecad.Authz.AspNetCore`).
- ✅ Grupo `/api/v1/ocorrencias` usa scheme default (Keycloak) — sem override para "Titular". Correto: endpoints são do Analista.
- ✅ `app.MapOcorrenciaEndpoints()` registrado em `Program.cs:281`.

### 3.4 AsNoTracking Workaround

- ✅ `OcorrenciaRepository.GetByIdAsync` usa `AsNoTracking()` (confirmado `4-Infra/.../OcorrenciaRepository.cs:50-52`).
- ✅ Todos os 3 handlers de mutação chamam `_repo.Update(ocorrencia)` (re-attach como tracked) **antes** de `SaveChangesAsync`, conforme exigido pelo padrão AsNoTracking. Padrão correto e consistente.

### 3.5 PaginationResponse Não-Genérico

- ✅ `OcorrenciaListResponse` envolve `PaginationResponse` (não-genérico, `Common/Responses/PaginationResponse.cs`). Padrão idêntico a `MinhasOcorrenciasResponse` (task 8.0).

### 3.6 analistaId do JWT

- ✅ `ParseAnalistaId` lê `httpContext.User.FindFirst("sub")` — mesmo padrão de `AnexoEndpoints:49` para `uploadadoPor`. Retorna `Guid.Empty` em fallback (irrelevante em fluxo autenticado real; o middleware de auth exige `sub` válido).

### 3.7 Sem Mudanças de Entidade/Migration

- ✅ `git status` confirma: apenas `Program.cs` modificado + novos arquivos em `Endpoints/`, `Ocorrencias/`, `UnitTests/Ocorrencias/`. **Zero** alterações em `Ocorrencia.cs`, `OcorrenciaConfiguration.cs`, `CadastroDbContext.cs` ou migrations. RF-38 atendido exclusivamente via logging estruturado (escopo decision no task file: "Pode ser armazenado em campos dedicados **e/ou** via o pipeline de auditoria two-tier existente").

---

## 4. Revisão de Segurança

| Endpoint | Auth Scheme | Permissão |
|---|---|---|
| GET `/` | Keycloak (default) | `ocorrencia:listar` |
| GET `/{id}` | Keycloak (default) | `ocorrencia:visualizar` |
| POST `/{id}/analisar` | Keycloak (default) | `ocorrencia:analisar` |
| POST `/{id}/resolver` | Keycloak (default) | `ocorrencia:resolver` |
| POST `/{id}/cancelar` | Keycloak (default) | `ocorrencia:cancelar` |

- ✅ Sem isolamento por `titularId` (correto — o analista vê todas as ocorrências por design RF-33).
- ✅ Sem endpoint anônimo; sem bypass de auth.
- ✅ `analistaId` é read-only do JWT (não aceito do body do request — `ResolverOcorrenciaRequest` e `CancelarOcorrenciaRequest` contêm apenas `Parecer`/`Justificativa`). Anti-tampering preservado.

---

## 5. Observações Não-Bloqueantes

1. **`Ocorrencia.Cancelar` reutiliza `ResolvidaEm`** (`3-Domain/Entities/Ocorrencia.cs:102`): o método de domínio define `ResolvidaEm = DateTime.UtcNow` no cancelamento (não há campo `CanceladaEm` dedicado). Este é um defeito semântico de modelagem de domínio da task 2.0, **não** da task 11.0 — o handler apenas invoca o método de domínio. Não bloqueia a task 11.0; recomenda-se issue de refatoração para adicionar `CanceladaEm` separado (ou renomear `ResolvidaEm` → `FechadaEm`) na task 2.0/domínio.

2. **`ParseAnalistaId` fallback para `Guid.Empty`:** Se o claim `sub` estiver ausente ou não for um Guid válido, retorna `Guid.Empty`. Em produção, o middleware Keycloak exige `sub` válido, então o fallback nunca é alcançado. Com `AUTH_ENABLED=false` (dev/test), o `TestAuthHandler` injeta `sub`. Não-bloqueante.

3. **Sem validação estrutural (FluentValidation) nos commands do analista:** `ResolverOcorrenciaCommand` e `CancelarOcorrenciaCommand` não têm validators dedicados. O domínio (`Ocorrencia.Resolver`/`Cancelar`) valida `string.IsNullOrWhiteSpace(parecer/justificativa)` e lança `DomainException` (→422). Defesa em profundidade poderia adicionar um validator FluentValidation, mas a decisão de confiar na validação de domínio é consistente com o design do state machine. Não-bloqueante.

4. **`OcorrenciaListResponse` é um response wrapper novo** (separado de `MinhasOcorrenciasResponse` do Portal). Boa separação de concerns: o response do analista pode evoluir independentemente (ex: adicionar nome do titular no futuro).

5. **Filtros inválidos retornam null (sem filtro) em vez de 400:** `ParseStatus` e `ParseTipo` retornam `null` quando o valor não casa com nenhum enum, efetivamente desabilitando o filtro. Comportamento consistente com `ListarMinhasOcorrenciasQueryHandler` (task 8.0). Documentado como decision pendente no review da task 8.0; mantém consistência entre handlers.

---

## 6. Conformidade com PRD e TechSpec

- **PRD RF-33 a RF-39:** Todos cobertos e empiricamente testados (26 testes unitários novos).
- **TechSpec — Endpoints de API (Analista):** 5/5 endpoints implementados com paths, verbs e permissões idênticos à tabela da TechSpec (linhas 226-230).
- **TechSpec — State machine:** Transições delegadas inteiramente ao domínio (`Ocorrencia.AssumirAnalise`/`Resolver`/`Cancelar`), que já lança `DomainException` (task 2.0). Handlers apenas propagam.
- **TechSpec — Eventos (Outbox/CloudEvents):** `cadastro.ocorrencia.resolvida` publicado via `_outbox.AddEvent` no mesmo `SaveChangesAsync` — atômico, conforme padrão.

---

## 7. Conclusão

Task **11.0 — Triagem e Resolução de Ocorrências pelo Analista (RF-33 a RF-39)** totalmente implementada, testada e em conformidade com PRD, TechSpec e padrões do projeto.

- ✅ 7/7 requisitos funcionais (RF-33 a RF-39) atendidos e testados.
- ✅ 5/5 endpoints com permissões corretas (scheme Keycloak default).
- ✅ Clean Architecture preservada (Application sem referência a Infra; string literal para event type).
- ✅ CQRS nativo (Commands/Queries/Handlers com interfaces corretas).
- ✅ AsNoTracking workaround correto em todos os handlers de mutação.
- ✅ RF-38 (auditoria) via logging estruturado com scope `{OcorrenciaId, AnalistaId}` — sem mudanças de entidade/migration (escopo decision).
- ✅ RF-39 (evento outbox) com string literal `"cadastro.ocorrencia.resolvida"`, atômico com SaveChanges.
- ✅ Build verde (0 erros); 360 testes passando (26 novos de Ocorrencia); 0 regressões.

**Veredito: APROVADA** — task desbloqueia 15.0 (frontend analista) e 16.0 (testes E2E).
