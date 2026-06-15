---
status: pending
parallelizable: true
blocked_by: ["4.0"]
---

<task_context>
<domain>cadastro/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"14.0"</unblocks>
</task_context>

# Tarefa 7.0: Consulta de Repertório — Obras e Fonogramas (RF-22 a RF-26)

## Visão Geral

Permitir que o titular autenticado consulte, em modo somente leitura, as obras (titularidade autoral) e fonogramas (participação conexa) dos quais é titular. Reutiliza os repositórios existentes `ITitularidadeRepository` e `IParticipacaoRepository` filtrados por `titularId` extraído do token. Sem BFF — consulta direta no cadastro-api.

## Requisitos

- RF-22 (listar obras com título, categoria, ISWC, percentual), RF-23 (listar fonogramas com ISRC, papel/percentual), RF-24 (isolamento por titular), RF-25 (somente leitura), RF-26 (filtrar e ordenar — Should Have)
- Tech Spec — seção *Endpoints de API* e decisão 7 (consulta direta no serviço)

## Subtarefas

- [ ] 7.1 Criar `2-Application/Cadastro.Application/Portal/Queries/ObterMinhasObrasQuery.cs` (`record ObterMinhasObrasQuery(Guid TitularId, string? Filtro, string? Sort) : IQuery<PaginationResponse<ObraTitularResponse>>`).
- [ ] 7.2 Criar `ObterMinhasObrasQueryHandler.cs` — usar `ITitularidadeRepository` (ou `IObraRepository` com filtro por `titularId`) para listar titularidades autorais do titular. Projetar para `ObraTitularResponse` (título da obra, categoria, ISWC quando houver, percentual do titular). Aplicar paginação e ordenação por título (RF-26).
- [ ] 7.3 Criar `2-Application/Cadastro.Application/Portal/Queries/ObterMeusFonogramasQuery.cs` (`record ObterMeusFonogramasQuery(Guid TitularId, string? Filtro) : IQuery<PaginationResponse<FonogramaTitularResponse>>`).
- [ ] 7.4 Criar `ObterMeusFonogramasQueryHandler.cs` — usar `IParticipacaoRepository` filtrado por `titularId` para listar participações conexas. Projetar para `FonogramaTitularResponse` (título da obra vinculada, ISRC, papel/percentual).
- [ ] 7.5 Criar endpoints em `PortalEndpoints.cs`:
  - `GET /api/v1/portal/minhas-obras` — `.RequireAuthorization("PortalTitular")`, injeta `ICurrentTitular`, suporta `?page=&size=&filtro=&sort=`.
  - `GET /api/v1/portal/meus-fonogramas` — idem.
- [ ] 7.6 DTOs: `ObraTitularResponse` (obraId, titulo, categoria, iswc?, percentual), `FonogramaTitularResponse` (fonogramaId, tituloObra, isrc, papel, percentual). Em `Portal/Responses/`.
- [ ] 7.7 Garantir isolamento (RF-24): os handlers usam **exclusivamente** o `titularId` de `ICurrentTitular` — nunca aceitam `titularId` do query string/body. Não há endpoint para consultar obras de outro titular.
- [ ] 7.8 Testes unitários:
  - `ObterMinhasObrasQueryHandlerTests.cs` — retorna apenas obras onde o titular é autor; filtro por título aplicado; ordenação por título.
  - `ObterMeusFonogramasQueryHandlerTests.cs` — retorna apenas participações do titular.
  - Mockar `ITitularidadeRepository`/`IParticipacaoRepository`.

## Sequenciamento

- Bloqueado por: 4.0 (`ICurrentTitular` para filtrar por titularId)
- Desbloqueia: 14.0 (página de repertório no frontend)
- Paralelizável: Sim (não toca as entidades de ocorrência/solicitação; reutiliza repositórios existentes somente leitura)

## Detalhes de Implementação

**Reuso de repositórios existentes:** `ITitularidadeRepository` já possui `ListarAsync` — verificar se aceita filtro por `titularId`. Se não existir filtro direto, adicionar um método `ListarPorTitularAsync(Guid titularId, ...)` à interface (e implementação). O mesmo para `IParticipacaoRepository`. Estas são adições de método read-only — baixo risco.

**Somente leitura (RF-25):** nenhum endpoint de escrita é exposto. As queries usam `AsNoTracking` (padrão de query existente em `ObraQueries`).

**Ordenação (RF-26):** `Sort` com prefixo `-` para DESC (padrão de `TitularFiltro`). Default: título ASC.

## Critérios de Sucesso

- Titular autenticado vê apenas suas obras e fonogramas (RF-22, RF-23, RF-24).
- Não há endpoint que permita consultar repertório de outro titular (RF-24).
- Filtro por título e ordenação funcionam (RF-26).
- Consultas são somente leitura (RF-25) — nenhum `POST`/`PUT` neste escopo.
- `dotnet test 5-Tests/Cadastro.UnitTests` passa.
