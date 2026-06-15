# Review — Task 8.0: Ocorrências — CRUD do Titular (RF-27 a RF-32)

> **PRD:** `tasks/cadastro/prd-acesso-titulares/prd.md`
> **Task:** `tasks/cadastro/prd-acesso-titulares/08_task.md`
> **Branch:** `feature/prd-acesso-titulares`
> **Data:** 2026-06-15
> **Validator:** ai-flow-validator (worker subagent)
> **validation_level:** standard

---

## 1. Validação Automatizada

### Comandos executados

| # | Comando | workdir | Resultado |
|---|---------|---------|-----------|
| 1 | `dotnet build Cadastro.sln` | `services/cadastro-api` | **OK** — 0 errors, 2 warnings (pré-existentes, alheias a esta task) |
| 2 | `dotnet test 5-Tests/Cadastro.UnitTests` | `services/cadastro-api` | **OK** — 319 tests passed, 0 failed |
| 3 | `dotnet test 5-Tests/Cadastro.UnitTests --filter "FullyQualifiedName~CriarOcorrencia|FullyQualifiedName~ListarMinhasOcorrencias"` | `services/cadastro-api` | **OK** — 20 tests passed (novos desta task) |

### Resumo do build

```
ok dotnet build: 1 projects, 0 errors, 2 warnings (00:00:05.86)
```

Warnings pré-existentes: 2× `NU1902` (vulnerabilidade moderada em `OpenTelemetry.Exporter.OpenTelemetryProtocol` 1.9.0) — ambas no `Cadastro.API.csproj`, não introduzidas por esta task.

### Resumo dos testes

```
ok dotnet test: 319 tests passed, 2 warnings in 2 projects (6.3 s)
```

Os 319 testes incluem os 20 novos testes de Task 8.0:
- `CriarOcorrenciaCommandHandlerTests` — 8 testes (RF-28 status ABERTA, mapeamento de 4 tipos, caso sem obra/fonograma, evento outbox, não-persiste-em-falha, descrição vazia/curta, tipo inválido, titularId vazio).
- `ListarMinhasOcorrenciasQueryHandlerTests` — 12 testes (RF-31 isolamento, defaults de paginação, 4 valores de status via `[Theory]`, status nulo, status inválido como fallback, mapeamento status+resolução, paginação, lista vazia).

Nenhuma regressão vs. baseline (Task 7.0 reportou 299 testes; agora 319 = +20 novos).

---

## 2. Revisão Técnica

### Aceitação dos Requisitos Funcionais (RF-27 a RF-32)

| RF | Status | Evidência |
|----|--------|-----------|
| **RF-27** — abrir ocorrência com tipo, obra/fonograma referenciado, descrição | ✅ | `CriarOcorrenciaCommand(Guid TitularId, string Tipo, Guid? ObraId, Guid? FonogramaId, string Descricao)`. Validator (`CriarOcorrenciaCommandValidator.cs:27-44`) valida `Tipo` em set explícito, `Descricao` min 10 / max 2000, `ObraId`/`FonogramaId` mutuamente opcionais. Endpoint `POST /api/v1/portal/ocorrencias` (`PortalEndpoints.cs:49,198-219`) recebe `CriarOcorrenciaRequest` e monta o command. |
| **RF-28** — nasce `ABERTA` | ✅ | `Ocorrencia.Criar(...)` força `Status = StatusOcorrencia.Aberta` (`Ocorrencia.cs:56`) — única porta de criação. Handler invoca `Ocorrencia.Criar` em `CriarOcorrenciaCommandHandler.cs:65`. Teste `HandleAsync_ComCommandValido_DeveCriarOcorrenciaNoStatusAberta` verifica `result.Status == "ABERTA"`. |
| **RF-29** — listar e filtrar por status | ✅ | Endpoint `GET /api/v1/portal/ocorrencias?status=&page=&size=` (`PortalEndpoints.cs:54,221-243`). `ListarMinhasOcorrenciasQueryHandler.ParseStatus` (`:53-64`) converte SCREAMING_SNAKE_CASE → enum para os 4 valores. Filtro repassado ao repositório via `OcorrenciaFiltro.Status`. Teste `[Theory]` cobre os 4 statuses. |
| **RF-30** — ver status e resolução | ✅ | `OcorrenciaResponse` (`OcorrenciaResponse.cs:9-18`) inclui `Status` e `Resolucao` (nullable) + `ResolvidaEm`. Teste `HandleAsync_DeveMapearStatusEResolucaoNoResponse` valida ABERTA (sem resolução) e RESOLVIDA (com resolução + resolvidaEm). |
| **RF-31** — isolamento (não ver ocorrências de outros) | ✅ | Ambos endpoints extraem `TitularId` de `ICurrentTitular.TitularId` (`PortalEndpoints.cs:211,236`), com guarda `IsAutenticado && TitularId != Guid.Empty`. `CriarOcorrenciaRequest` não tem campo `TitularId`. Handler repassa `query.TitularId` ao `OcorrenciaFiltro.TitularId` — filtragem no SQL (`OcorrenciaRepository.cs:31-32`). Não há endpoint `GET /portal/ocorrencias/{id}` para o titular (conforme `08_task.md:55`). Teste `HandleAsync_DeveRepassarTitularIdDoTokenParaOFiltroDoRepositorio` verifica empiricamente o `filtroCapturado.TitularId`. |
| **RF-32** — evento outbox `cadastro.ocorrencia.aberta` | ✅ | Handler chama `_outbox.AddEvent("cadastro.ocorrencia.aberta", ocorrencia.Id.ToString(), payload)` (`CriarOcorrenciaCommandHandler.cs:78-90`) **antes** de `SaveChangesAsync` (atômico). A string literal bate com `EventTypes.OcorrenciaAberta` (`EventTypes.cs:28`). Teste `HandleAsync_ComCommandValido_DevePublicarEventoOcorrenciaAberta` verifica a chamada com `Times.Once`. |

### Subtarefas (8.1 a 8.8)

| Subtask | Status | Notas |
|---------|--------|-------|
| 8.1 `CriarOcorrenciaCommand` | ✅ | Record `: ICommand<OcorrenciaResponse>`, todos os campos conformes. |
| 8.2 `CriarOcorrenciaCommandValidator` | ✅ | `TiposValidos` HashSet (OrdinalIgnoreCase), `Descricao` min 10/max 2000, `ObraId`/`FonogramaId` opcionais, `TitularId != Guid.Empty`. |
| 8.3 `CriarOcorrenciaCommandHandler` | ✅ | Pipeline: validar → parse Tipo → `Ocorrencia.Criar` → `AddAsync` → `AddEvent` → `SaveChangesAsync` → `MapToResponse`. Matches spec. |
| 8.4 `ListarMinhasOcorrenciasQuery` | ✅ (com desvio justificado) | Record `: IQuery<MinhasOcorrenciasResponse>` em vez de `IQuery<PaginationResponse<OcorrenciaResponse>>`. Justificado: o codebase usa `PaginationResponse` **não-genérico** + wrapper response (ver `MinhasObrasResponse`); a instrução do validator confirma "PaginationResponse is non-generic". |
| 8.5 `ListarMinhasOcorrenciasQueryHandler` | ✅ | Usa `IOcorrenciaRepository.ListarAsync(OcorrenciaFiltro)`; `TitularId` sempre do token. |
| 8.6 Endpoints em `PortalEndpoints.cs` | ✅ | `POST /ocorrencias` + `GET /ocorrencias` no grupo `/api/v1/portal` com `.RequireAuthorization("PortalTitular")`. |
| 8.7 DTOs `OcorrenciaResponse` + `MinhasOcorrenciasResponse` | ✅ | Ambos em `Portal/Responses/`; wrapper segue padrão `MinhasObrasResponse`. |
| 8.8 Testes unitários (AAA + Moq) | ✅ | 20 testes cobrem ambos handlers; AAA explícito; Moq para `IOcorrenciaRepository`, `IOutboxEventWriter`, `IValidator<>`. |

### Conformidade com Padrões

| Padrão | Status | Evidência |
|--------|--------|-----------|
| **Clean Architecture** — Application não referencia Infra | ✅ | Event type é string literal `const EventTypeOcorrenciaAberta = "cadastro.ocorrencia.aberta"` no próprio handler (`CriarOcorrenciaCommandHandler.cs:27`), **não** `EventTypes.OcorrenciaAberta` de Infra. Mesma abordagem de `AtualizarContatoCommandHandler.cs:112`. |
| **CQRS nativo** | ✅ | `CriarOcorrenciaCommand : ICommand<OcorrenciaResponse>` + `CriarOcorrenciaCommandHandler : ICommandHandler<,>`; `ListarMinhasOcorrenciasQuery : IQuery<MinhasOcorrenciasResponse>` + `ListarMinhasOcorrenciasQueryHandler : IQueryHandler<,>`. |
| **Outbox Pattern** | ✅ | `IOutboxEventWriter.AddEvent(type, subject, payload)` no mesmo `SaveChangesAsync` (atômico). |
| **DI registration** | ✅ | Handlers auto-registrados via Scrutor assembly scanning (`Program.cs:139-148`); validator via `AddValidatorsFromAssemblyContaining<CriarTitularCommandValidator>` (`:151`); `IOcorrenciaRepository` registrado em `Program.cs:96`. |
| **Endpoints — auth check** | ✅ | Ambos checam `!currentTitular.IsAutenticado || currentTitular.TitularId == Guid.Empty` → 401 (`PortalEndpoints.cs:204,229`). Grupo com `.RequireAuthorization("PortalTitular")`. |
| **`PaginationResponse` não-genérico** | ✅ | `PaginationResponse(Page, Size, Total, TotalPages)` — sem `<T>`. Wrapper `MinhasOcorrenciasResponse(Data, Pagination)`. |
| **`AsNoTracking` em leituras** | ✅ | `OcorrenciaRepository.ListarAsync` (`:24-25`) e `GetByIdAsync` (`:50-51`) aplicam `.AsNoTracking()`. Filtros no SQL, não in-memory. |
| **Auditoria / log scope** | ✅ | Handler usa `_logger.BeginScope(new Dictionary<string, object> { ["TitularId"] = command.TitularId })` (`CriarOcorrenciaCommandHandler.cs:59`) — correlação por titularId, sem logar CPF/senha. |

### Revisão de Segurança

- **RF-31 isolamento (CRITICAL):** ✅ `titularId` é extraído exclusivamente de `ICurrentTitular` (JWT) em ambos endpoints. `CriarOcorrenciaRequest` (`PortalEndpoints.cs:256-260`) não tem campo `TitularId`. `ListarMinhasOcorrencias` não aceita `titularId` na query string. Não há endpoint `GET /ocorrencias/{id}` para o titular. Filtro `TitularId` é sempre preenchido pelo handler a partir da query (que vem do token).
- **Payload do outbox:** ✅ contém apenas `ocorrenciaId, titularId, tipo, obraId, fonogramaId, descricao, abertaEm` — **sem CPF/CNPJ** ou dados sensíveis de identidade. `descricao` é texto livre do próprio titular relatando o erro (apropriado incluir no evento).
- **POST endpoint:** ✅ usa `[FromBody] CriarOcorrenciaRequest` e monta o command com `TitularId: currentTitular.TitularId` (anti-tampering).

---

## 3. Issues Encontradas

Nenhuma issue bloqueante identificada. As observações abaixo são non-blocking (Info/Low).

### Observação 1 — `ParseStatus` trata string inválida como "sem filtro" (Low / Info)

- **Severidade:** Low (UX/comportamento de borda)
- **Arquivo:** `ListarMinhasOcorrenciasQueryHandler.cs:53-64`
- **Descrição:** Quando o cliente passa `?status=INEXISTENTE`, o handler retorna `null` (fallback defensivo) em vez de 400 BadRequest. Isso significa que um typo no filtro silenciosamente retorna todas as ocorrências de todos os statuses.
- **Mitigação atual:** testado explicitamente (`HandleAsync_ComStatusInvalido_DeveTratarComoSemFiltro`) — comportamento é determinístico e documentado.
- **Direção de correção (não aplicada pelo validator):** se desejado, lançar `ValidationException` para status desconhecido. Não é bloqueante para a PoC e é uma decisão defensiva válida. Vale alinhar com `ParseStatus` do handler de Analista (task 11.0) para consistência.

### Observação 2 — Validador estrutural mockado em alguns testes (Info)

- **Severidade:** Info
- **Arquivo:** `CriarOcorrenciaCommandHandlerTests.cs:164,193,214,234,254`
- **Descrição:** Os testes de falha de validação (`HandleAsync_ComDescricaoVazia_DeveLancarValidationException`, etc.) mockam o `IValidator<CriarOcorrenciaCommand>` para retornar erros pré-configurados, em vez de exercitar o `CriarOcorrenciaCommandValidator` real. Isso testa o pipeline do handler (se ele traduz ValidationResult → ValidationException corretamente), mas não testa as regras reais do validator (min 10, max 2000, set de tipos válidos).
- **Nota:** este é o padrão adotado em todo o projeto (`AtualizarContatoCommandHandlerTests` faz o mesmo) — consistente com a convenção. O validator real é indiretamente exercitado nos testes de integração.
- **Direção:** nenhuma ação necessária para esta task. Sugestão de melhoria de processo: considerar adicionar testes unitários diretos para `CriarOcorrenciaCommandValidator` (sem mock) em futura dívida técnica.

### Observação 3 — Desvio justificado da especificação da task (Info)

- **Severidade:** Info (justificado)
- **Arquivo:** `ListarMinhasOcorrenciasQuery.cs:14-18`
- **Descrição:** A task 8.4 especificava `IQuery<PaginationResponse<OcorrenciaResponse>>` (genérico), mas a implementação usa `IQuery<MinhasOcorrenciasResponse>` (wrapper com `Data` + `Pagination`). O implementer corretamente seguiu o padrão real do codebase (`MinhasObrasResponse`, `ObraListResponse`), onde `PaginationResponse` é **não-genérico**. A instrução do validator confirma explicitamente "PaginationResponse is non-generic".
- **Direção:** nenhuma ação necessária — desvio alinhado ao padrão arquitetural. Sugestão: alinhar o texto das tasks futuras com a convenção do codebase (wrapper response, não generic pagination).

### Observação 4 — `ParseTipo` redundante após validator (Info / Nitpick)

- **Severidade:** Info (nitpick — defesa em profundidade)
- **Arquivo:** `CriarOcorrenciaCommandHandler.cs:116-139`
- **Descrição:** O método `ParseTipo` faz um segundo parse da string `Tipo` após o validator já ter validado o formato. Há fallback defensivo que lança `ValidationException` se o parse falhar. Isso é correto (defesa em profundidade) e o comentário no código justifica a decisão.
- **Direção:** nenhuma ação. Decisão defensiva válida; pode ser simplificada no futuro se o `TipoOcorrencia` ganhar um `Parse` canônico no domínio.

---

## 4. Recomendação Final

### ✅ APROVADA

**Resumo:**

A implementação da Task 8.0 atende integralmente aos critérios de aceitação RF-27 a RF-32 e a todas as 8 subtarefas (8.1-8.8). O build compila sem erros (0 errors, 2 warnings NU1902 pré-existentes) e todos os 319 testes unitários passam, incluindo os 20 novos testes que cobrem RF-28 (status ABERTA), RF-32 (evento outbox), RF-29 (4 valores de status), RF-30 (status + resolução), RF-31 (isolamento via token) e casos de erro (descrição vazia/curta, tipo inválido, titularId vazio, falha não persiste).

**Destaques positivos:**

- **Isolamento RF-31 impecável:** `titularId` exclusivamente do JWT via `ICurrentTitular` em ambos endpoints; `CriarOcorrenciaRequest` sem campo `TitularId`; teste `HandleAsync_DeveRepassarTitularIdDoTokenParaOFiltroDoRepositorio` verifica empiricamente o filtro repassado ao repositório.
- **RF-28 garantido pelo domínio:** `Ocorrencia.Criar` é a única porta e força `Status = Aberta`; handler não toca o status.
- **RF-32 outbox atômico:** `AddEvent` chamado antes de `SaveChangesAsync`; string literal `"cadastro.ocorrencia.aberta"` bate com `EventTypes.OcorrenciaAberta` de Infra (Clean Architecture preservada — Application não referencia Infra).
- **Mapeamento SCREAMING_SNAKE_CASE ↔ enum consistente:** `FormatTipo`/`FormatStatus` cobrem todos os valores; `ParseStatus` trata os 4 statuses + fallback.
- **AsNoTracking em leituras** confirmado no `OcorrenciaRepository` (filtros no SQL, paginação via `Skip`/`Take`).
- **Log scope com `TitularId`** (não loga CPF/senha) — conformidade LGPD.
- **Testes realistas:** usam métodos de domínio (`AssumirAnalise`/`Resolver`/`Cancelar`) para construir ocorrências em estados não-ABERTA, em vez de reflection bruta nos setters (apenas `AbertaEm` sobrescrito via reflection para determinismo).

Nenhuma issue bloqueante identificada. As 4 observações são non-blocking (1 Low, 3 Info).

---

*Review gerado seguindo a skill `ai-flow-validator`. O validator NÃO editou código, NÃO fez commits, NÃO fez merge e NÃO abriu PRs.*
