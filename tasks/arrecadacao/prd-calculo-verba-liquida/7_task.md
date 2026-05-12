---
status: pending
parallelizable: true
blocked_by: ["5.0"]
---

<task_context>
<domain>arrecadacao/api+application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server,database</dependencies>
<unblocks>"9.0, 10.0"</unblocks>
</task_context>

# Tarefa 7.0: Queries + DTOs + `VerbaSpecification` + `VerbaController`

## Relacionada as User Stories

- [HU-03] Acompanhar verbas por rubrica x periodo (direta)
- [HU-04] Acompanhar verbas por rubrica — agregado (direta)
- [HU-05] Visualizar status da verba (direta — campo na resposta)

## Visao Geral

Implementar 3 endpoints REST read-only conforme techspec: listagem detalhada paginada, agregada por rubrica e busca pontual. Reaproveitar o pipeline CQRS (`QueryDispatcher`/`QueryHandler`), `Specification` para filtros, records para DTOs, e o `GlobalExceptionHandler` para RFC 7807. Padrao identico ao ja em `PagamentoController`.

## Requisitos

- DTOs como records em `arrecadacao-application/...dto/`:
  - `VerbaResponse(UUID id, RubricaResumoResponse rubrica, String periodo, String valorBrutoTotal, String deducaoEcad, String deducaoAssociacoes, String verbaLiquida, int quantidadePagamentos, String status, Instant atualizadoEm)`
  - `VerbaAgregadoResponse(RubricaResumoResponse rubrica, String valorBrutoTotal, String verbaLiquidaTotal, int quantidadePeriodos)`
- Queries em `arrecadacao-application/...queries/`:
  - `ListarVerbasQuery(String rubricaSigla, String periodo, String periodoInicio, String periodoFim, StatusVerba status, int page, int size, String sort)`
  - `ListarVerbasAgregadasQuery(String periodoInicio, String periodoFim, StatusVerba status)`
  - `BuscarVerbaQuery(String rubricaSigla, String periodo)`
- Handlers em `.../queries/handlers/` retornando `Page<VerbaResponse>`, `List<VerbaAgregadoResponse>`, `VerbaResponse`
- `VerbaSpecification` com filtros: rubricaSigla (join), periodo (igual), periodo range (between), status
- Sort parser: default `-periodo` (DESC) na detalhada; `rubricaSigla` ASC na agregada; sort prefix `-` indica DESC (padrao do projeto)
- `VerbaController` em `arrecadacao-api/...controllers/`:
  - `GET  /api/v1/verbas` → paginada
  - `GET  /api/v1/verbas/agregado-por-rubrica` → agregada
  - `GET  /api/v1/verbas/{rubricaSigla}/{periodo}` → 200 ou 404
- `@PreAuthorize("hasAnyRole('analista-arrecadacao', 'consultor-arrecadacao')")` nos endpoints
- 404 retornado via `EntidadeNaoEncontradaException` (ja mapeada no `GlobalExceptionHandler`)
- Bean Validation nas queries (regex `\\d{4}-\\d{2}` para periodo, etc.) — padrao do projeto

## Subtarefas

- [ ] 7.1 Criar records `VerbaResponse` e `VerbaAgregadoResponse`
- [ ] 7.2 Criar queries + handlers + dispatcher registrado
- [ ] 7.3 Criar `VerbaSpecification` com filtros
- [ ] 7.4 Implementar metodo `findAgregadoPorRubrica` no `JpaVerbaRepository` (task 2.0 ja preparou a interface)
- [ ] 7.5 Criar `VerbaController` com 3 endpoints, validacoes e `@PreAuthorize`
- [ ] 7.6 Adicionar logs no controller (apenas no nivel de entrada — debug)
- [ ] 7.7 Testes unitarios dos handlers (mocks de repository)
- [ ] 7.8 Atualizar OpenAPI/Swagger (se existir descricao automatica via springdoc; verificar `arrecadacao-api`)

## Sequenciamento

- Bloqueado por: 5.0 (precisa de dados sendo calculados para validar end-to-end)
- Desbloqueia: 9.0 (integration), 10.0 (frontend pode usar mock ate o controller estar pronto)
- Paralelizavel: Sim (independente de 6.0 e 8.0)

## Rastreabilidade

- Esta tarefa cobre: HU-03 (direta), HU-04 (direta), HU-05 (direta)
- Evidencia esperada: testes unitarios verdes; cURL contra `/api/v1/verbas` retorna paginado correto; 404 quando rubrica/periodo nao existe; resposta inclui campo `status`

## Detalhes de Implementacao

Resposta detalhada (RF-17):

```json
{
  "content": [{
    "id": "uuid",
    "rubrica": {"id": "uuid", "sigla": "RADIO", "nome": "Radio AM/FM"},
    "periodo": "2026-04",
    "valorBrutoTotal": "1073.10",
    "deducaoEcad": "107.31",
    "deducaoAssociacoes": "53.66",
    "verbaLiquida": "912.13",
    "quantidadePagamentos": 3,
    "status": "ABERTA",
    "atualizadoEm": "2026-05-11T14:30:00Z"
  }],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```

Resposta agregada (RF-18):

```json
[{
  "rubrica": {"id": "uuid", "sigla": "RADIO", "nome": "Radio AM/FM"},
  "valorBrutoTotal": "3073.10",
  "verbaLiquidaTotal": "2612.13",
  "quantidadePeriodos": 2
}]
```

`BigDecimal` serializado como `toPlainString()` (consistente com `Pagamento`).

## Criterios de Sucesso

- 3 endpoints retornam HTTP 200/404 conforme contrato
- `mvn -pl arrecadacao-application,arrecadacao-api test` verde
- Paginacao validada com >20 verbas (page=0,1,2 retornam slices corretos)
- Sort `-periodo` na detalhada e `rubricaSigla` ASC na agregada por padrao
- Bean Validation rejeita periodo `2026-13` ou `abc` com 400 RFC 7807
- Sem queries cross-schema (verba so referencia `arrecadacao.rubricas`)
