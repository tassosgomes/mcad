---
status: pending
parallelizable: true
blocked_by: ["8.0", "10.0"]
---

<task_context>
<domain>cadastro/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"15.0", "16.0"</unblocks>
</task_context>

# Tarefa 11.0: Triagem e Resolução de Ocorrências pelo Analista (RF-33 a RF-39)

## Visão Geral

Implementar os endpoints de Analista (scheme Keycloak + `RequireCadastroPermission`) para listar todas as ocorrências, assumir análise (`ABERTA → EM_ANALISE`), resolver (`EM_ANALISE → RESOLVIDA`) e cancelar (com justificativa). A state machine do domínio (tarefa 2.0) já rejeita transições inválidas (RF-37). Cada transição registra autor/data (RF-38). Evento `cadastro.ocorrencia.resolvida` ao resolver (RF-39).

## Requisitos

- RF-33 (listar todas com filtros), RF-34 (`ABERTA → EM_ANALISE`), RF-35 (`EM_ANALISE → RESOLVIDA` com resolução), RF-36 (cancelar com justificativa), RF-37 (impedir transições inválidas), RF-38 (autor/data/motivo em cada transição), RF-39 (evento outbox)
- Tech Spec — seção *Endpoints de API (Analista)*

## Subtarefas

- [ ] 11.1 Criar `2-Application/Cadastro.Application/Ocorrencias/Commands/AnalisarOcorrenciaCommand.cs` (`record AnalisarOcorrenciaCommand(Guid Id, Guid AnalistaId) : ICommand<OcorrenciaResponse>`).
- [ ] 11.2 Criar `AnalisarOcorrenciaCommandHandler.cs` — carregar ocorrência (tracked), `ocorrencia.AssumirAnalise()` (state machine valida `ABERTA`), registrar autor (analistaId) e data no domínio, `SaveChangesAsync`.
- [ ] 11.3 Criar `ResolverOcorrenciaCommand.cs` + `ResolverOcorrenciaCommandHandler.cs` — `ocorrencia.Resolver(parecer)` (valida `EM_ANALISE`), `_outbox.AddEvent(EventTypes.OcorrenciaResolvida, ...)` (RF-39), `SaveChangesAsync`.
- [ ] 11.4 Criar `CancelarOcorrenciaCommand.cs` (`record CancelarOcorrenciaCommand(Guid Id, string Justificativa, Guid AnalistaId)`) + `CancelarOcorrenciaCommandHandler.cs` — `ocorrencia.Cancelar(justificativa)` (de `ABERTA` ou `EM_ANALISE`).
- [ ] 11.5 Criar `2-Application/Cadastro.Application/Ocorrencias/Queries/ListarOcorrenciasQuery.cs` (`record ListarOcorrenciasQuery(string? Status, Guid? TitularId, string? Tipo, int Page, int Size) : IQuery<PaginationResponse<OcorrenciaResponse>>`) + handler. **Sem filtro fixo de titularId** — o Analista vê todas (RF-33).
- [ ] 11.6 Criar `2-Application/Cadastro.Application/Ocorrencias/Queries/GetOcorrenciaByIdQuery.cs` + handler.
- [ ] 11.7 Criar `1-Services/Cadastro.API/Endpoints/OcorrenciaEndpoints.cs` — grupo `/api/v1/ocorrencias` (scheme Keycloak default):
  - `GET /` — `.RequireCadastroPermission(CadastroPermissions.OcorrenciaListar)`
  - `GET /{id}` — `.RequireCadastroPermission(CadastroPermissions.OcorrenciaVisualizar)`
  - `POST /{id}/analisar` — `.RequireCadastroPermission(CadastroPermissions.OcorrenciaAnalisar)`
  - `POST /{id}/resolver` — `.RequireCadastroPermission(CadastroPermissions.OcorrenciaResolver)`
  - `POST /{id}/cancelar` — `.RequireCadastroPermission(CadastroPermissions.OcorrenciaCancelar)`
  - Registrar `MapOcorrenciaEndpoints(app)` no `Program.cs`.
- [ ] 11.8 Obter `analistaId` do `ICurrentUserPermissions`/`HttpContext.User` (claim `sub` do token Keycloak — padrão usado em `AnexoEndpoints.cs` que lê `httpContext.User.FindFirst("sub")`).
- [ ] 11.9 Testes unitários (`5-Tests/Cadastro.UnitTests/Ocorrencias/`):
  - `AnalisarOcorrenciaCommandHandlerTests.cs` — `ABERTA → EM_ANALISE` ok; `RESOLVIDA → EM_ANALISE` → `DomainException` (RF-37).
  - `ResolverOcorrenciaCommandHandlerTests.cs` — `EM_ANALISE → RESOLVIDA` + `AddEvent("cadastro.ocorrencia.resolvida")` (RF-39).
  - `CancelarOcorrenciaCommandHandlerTests.cs` — cancela de `ABERTA` e `EM_ANALISE`; `CANCELADA → CANCELADA` → `DomainException`.

## Sequenciamento

- Bloqueado por: 8.0 (entidade Ocorrencia + repo titular), 10.0 (permissões)
- Desbloqueia: 15.0 (frontend analista), 16.0 (testes E2E)
- Paralelizável: Sim (paralelo a 12.0 — aprovação de solicitações)

## Detalhes de Implementação

**Registro de auditoria de transição (RF-38):** cada método da state machine (`AssumirAnalise`, `Resolver`, `Cancelar`) deve registrar quem/motivo. Pode ser armazenado em campos dedicados na `Ocorrencia` (`Resolucao`, `JustificativaCancelamento`) e/ou via o pipeline de auditoria two-tier existente. Considerar adicionar um log estruturado com scope `{OcorrenciaId}` + `{AnalistaId}`.

**State machine no domínio:** a entidade `Ocorrencia` (criada na tarefa 2.0) já lança `DomainException` em transições inválidas — o handler apenas chama o método e deixa a exceção propagar (mapeada a 422 pelo `GlobalExceptionHandler`).

**Evento RF-39:** `_outbox.AddEvent(EventTypes.OcorrenciaResolvida, ocorrencia.Id.ToString(), new { ocorrenciaId, titularId, resolucao })` no mesmo `SaveChangesAsync`.

## Critérios de Sucesso

- Analista lista todas as ocorrências com filtros por status/titular/tipo (RF-33).
- Transições `ABERTA → EM_ANALISE → RESOLVIDA` funcionam (RF-34, RF-35).
- Cancelamento com justificativa funciona (RF-36).
- Transições inválidas (ex: `RESOLVIDA → ABERTA`) rejeitadas com 422 (RF-37).
- Cada transição registra autor e data (RF-38).
- Evento `cadastro.ocorrencia.resolvida` publicado (RF-39).
- Endpoint sem permissão → 403 (scheme Keycloak + `RequireCadastroPermission`).
- `dotnet test 5-Tests/Cadastro.UnitTests` passa.
