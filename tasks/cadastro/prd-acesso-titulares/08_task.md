---
status: pending
parallelizable: true
blocked_by: ["3.0", "4.0"]
---

<task_context>
<domain>cadastro/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"11.0", "14.0"</unblocks>
</task_context>

# Tarefa 8.0: Ocorrências — CRUD do Titular (RF-27 a RF-32)

## Visão Geral

Implementar a abertura e listagem de ocorrências pelo titular autenticado. A ocorrência nasce no estado `ABERTA`. Inclui o evento outbox `cadastro.ocorrencia.aberta`. Os endpoints de triagem pelo Analista ficam na tarefa 11.0.

## Requisitos

- RF-27 (abrir ocorrência com tipo, obra/fonograma referenciado, descrição), RF-28 (nasce `ABERTA`), RF-29 (listar e filtrar por status), RF-30 (ver status e resolução), RF-31 (isolamento — não ver ocorrências de outros), RF-32 (evento outbox)
- Tech Spec — seção *Endpoints de API* e *Eventos*

## Subtarefas

- [ ] 8.1 Criar `2-Application/Cadastro.Application/Portal/Commands/CriarOcorrenciaCommand.cs` (`record CriarOcorrenciaCommand(Guid TitularId, string Tipo, Guid? ObraId, Guid? FonogramaId, string Descricao) : ICommand<OcorrenciaResponse>`).
- [ ] 8.2 Criar `CriarOcorrenciaCommandValidator.cs` — `Tipo` deve ser um enum válido, `Descricao` não vazia (mín. 10 chars), `ObraId`/`FonogramaId` mutuamente opcionais.
- [ ] 8.3 Criar `CriarOcorrenciaCommandHandler.cs`:
  1. `Ocorrencia.Criar(titularId, tipo, obraId, fonogramaId, descricao)` — o domínio força `Status = ABERTA` (RF-28).
  2. `_repo.AddAsync` + `_outbox.AddEvent(EventTypes.OcorrenciaAberta, ocorrencia.Id.ToString(), payload)` (RF-32).
  3. `_repo.SaveChangesAsync`.
  4. Retornar `OcorrenciaResponse`.
- [ ] 8.4 Criar `2-Application/Cadastro.Application/Portal/Queries/ListarMinhasOcorrenciasQuery.cs` (`record ListarMinhasOcorrenciasQuery(Guid TitularId, string? Status, int Page, int Size) : IQuery<PaginationResponse<OcorrenciaResponse>>`).
- [ ] 8.5 Criar `ListarMinhasOcorrenciasQueryHandler.cs` — usar `IOcorrenciaRepository.ListarAsync(OcorrenciaFiltro { TitularId = ... }, ct)`. **Filtro de titularId é sempre o do `ICurrentTitular`** (RF-31).
- [ ] 8.6 Criar endpoints em `PortalEndpoints.cs` (grupo `/api/v1/portal`):
  - `POST /ocorrencias` — `.RequireAuthorization("PortalTitular")`, injeta `ICurrentTitular`.
  - `GET /ocorrencias` — `.RequireAuthorization("PortalTitular")`, suporta `?status=&page=&size=`.
- [ ] 8.7 DTO: `OcorrenciaResponse` (id, tipo, obraId?, fonogramaId?, descricao, status, resolucao?, abertaEm, resolvidaEm?). Em `Portal/Responses/`.
- [ ] 8.8 Testes unitários (`5-Tests/Cadastro.UnitTests/Portal/`):
  - `CriarOcorrenciaCommandHandlerTests.cs` — nasce `ABERTA`; emite `AddEvent("cadastro.ocorrencia.aberta")`; descrição vazia → `ValidationException`.
  - `ListarMinhasOcorrenciasQueryHandlerTests.cs` — filtra por `titularId` do `ICurrentTitular`; filtra por `status`.
  - Mockar `IOcorrenciaRepository` e `IOutboxEventWriter`.

## Sequenciamento

- Bloqueado por: 3.0 (tabela `ocorrencias` + repositório), 4.0 (`ICurrentTitular`)
- Desbloqueia: 11.0 (Analista tria as ocorrências criadas aqui), 14.0 (frontend)
- Paralelizável: Sim (independente de 6.0, 7.0, 9.0)

## Detalhes de Implementação

**Isolamento (RF-31):** os endpoints do titular **nunca** aceitam `titularId` por parâmetro — sempre extraem de `ICurrentTitular.TitularId`. O repositório `ListarAsync` recebe `OcorrenciaFiltro.TitularId` preenchido pelo handler. Não há endpoint `GET /portal/ocorrencias/{id}` para o titular na PoC (apenas listagem) — se adicionado, deve validar que a ocorrência pertence ao titular autenticado.

**Validação de obra/fonograma referenciada:** na PoC, não validar a existência da obra/fonograma referenciada (referência fraca — `ObraId?`/`FonogramaId?` sem FK). Se desejado, validar opcionalmente no handler.

## Critérios de Sucesso

- Titular abre ocorrência e ela nasce `ABERTA` (RF-27, RF-28).
- Evento `cadastro.ocorrencia.aberta` em `outbox_events` (RF-32).
- Titular lista apenas suas próprias ocorrências, com filtro por status (RF-29, RF-30, RF-31).
- `dotnet test 5-Tests/Cadastro.UnitTests` passa.
