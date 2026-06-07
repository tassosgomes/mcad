---
status: pending
parallelizable: true
blocked_by: ["1.0", "2.0"]
---

<task_context>
<domain>distribuicao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0", "8.0"</unblocks>
</task_context>

# Tarefa 3.0: ListarTitularesDemonstrativoQueryHandler

## Visao Geral

Implementa o caso de uso de listagem paginada de titulares com creditos em um processo. Usa dois selects + merge em Java para calcular `totalLiberado` por titular (decisao tecnica documentada na techspec, secao 2). Pode ser desenvolvida em paralelo com a Task 4.0.

## Requisitos

- Criar `ListarTitularesDemonstrativoQuery` record com campos: processoId, titularNome, page, size, sort
- Criar `ListarTitularesDemonstrativoQueryHandler` que retorna `TitularesDemonstrativoPageResponse`
- Validar existencia do processo via `ProcessoRepository.findById()` — lancar `NotFoundException` se ausente
- Merge de `totalLiberado` via `sumLiberadosByProcessoLiberacaoId()` usando o proprio processoId como processoLiberacaoId
- Para `sort=totalAReceber`: ordenar a pagina retornada em Java (nao e global) apos o merge
- Para `sort=nome` (default): ordenacao feita no JPQL
- `totalAReceber = totalCalculado + totalLiberado` (sem somar RETIDO)
- `quantidadeObras` da projecao inclui apenas CALCULADO; para LIBERADO o merge e feito mas quantidadeObras nao e somado (PRD nao exige)

## Subtarefas

- [ ] 3.1 Criar `ListarTitularesDemonstrativoQuery` record em `distribuicao-application/.../application/queries/`
- [ ] 3.2 Criar `ListarTitularesDemonstrativoQueryHandler` em `distribuicao-application/.../application/queries/handlers/`
- [ ] 3.3 Injetar `ProcessoRepository` e `CreditoRepository` no handler via construtor
- [ ] 3.4 Implementar logica de merge: chamar `sumLiberadosByProcessoLiberacaoId(processoId)`, depois enriquecer cada `TitularDemonstrativoResumoResponse`
- [ ] 3.5 Implementar bifurcacao de ordenacao: `sort=totalAReceber` ordena lista Java; `sort=nome` delega ao JPQL
- [ ] 3.6 Mapear `TitularDemonstrativoProjection` → `TitularDemonstrativoResumoResponse` (campos monetarios para String)
- [ ] 3.7 Construir `PaginationMetadata` com totalElements e totalPages
- [ ] 3.8 Adicionar log DEBUG quando `processo.status != FINALIZADO`

## Sequenciamento

- Bloqueado por: 1.0, 2.0
- Desbloqueia: 5.0, 8.0
- Paralelizavel: Sim (pode ser desenvolvida em paralelo com Task 4.0)

## Detalhes de Implementacao

### Localizacao dos arquivos

```
distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/
  queries/ListarTitularesDemonstrativoQuery.java        ← novo
  queries/handlers/ListarTitularesDemonstrativoQueryHandler.java  ← novo
```

### ListarTitularesDemonstrativoQuery

```java
public record ListarTitularesDemonstrativoQuery(
    UUID processoId,
    String titularNome,
    int page,
    int size,
    String sort   // "nome" (default) | "totalAReceber"
) {}
```

### Esqueleto do handler

```java
@Component
public class ListarTitularesDemonstrativoQueryHandler {

    private final ProcessoRepository processoRepository;
    private final CreditoRepository creditoRepository;

    // construtor

    public TitularesDemonstrativoPageResponse handle(ListarTitularesDemonstrativoQuery query) {
        var processo = processoRepository.findById(query.processoId())
            .orElseThrow(() -> new NotFoundException("Processo nao encontrado: " + query.processoId()));

        if (processo.getStatus() != StatusProcesso.FINALIZADO) {
            log.debug("Listando demonstrativo de processo nao finalizado: {}", query.processoId());
        }

        var pageable = PageRequest.of(query.page(), query.size());
        var projections = creditoRepository.findTitularesByProcessoId(
            query.processoId(), query.titularNome(), pageable);
        var total = creditoRepository.countTitularesByProcessoId(
            query.processoId(), query.titularNome());

        // merge de totalLiberado
        var liberadosMap = creditoRepository.sumLiberadosByProcessoLiberacaoId(query.processoId());

        List<TitularDemonstrativoResumoResponse> items = projections.stream()
            .map(p -> toResumo(p, liberadosMap.getOrDefault(p.titularId(), BigDecimal.ZERO)))
            .collect(toList());

        // ordenacao em Java somente para sort=totalAReceber
        if ("totalAReceber".equals(query.sort())) {
            items.sort(Comparator.comparing(
                r -> new BigDecimal(r.totalAReceber()), Comparator.reverseOrder()));
        }

        int totalPages = (int) Math.ceil((double) total / query.size());
        var metadata = new CalculoProcessoResponse.PaginationMetadata(
            query.page(), query.size(), total, totalPages);

        return new TitularesDemonstrativoPageResponse(items, metadata);
    }

    private TitularDemonstrativoResumoResponse toResumo(
            TitularDemonstrativoProjection p, BigDecimal totalLiberado) {
        BigDecimal totalAReceber = p.totalCalculado().add(totalLiberado);
        return new TitularDemonstrativoResumoResponse(
            p.titularId(),
            p.titularNome(),
            format2(p.totalCalculado()),
            format2(p.totalRetido()),
            format2(totalLiberado),
            format2(totalAReceber),
            (int) p.quantidadeObras()
        );
    }
}
```

### Nota sobre paginacao com sort=totalAReceber

A ordenacao por `totalAReceber` e feita na pagina retornada (nao e global). Processos com muitos titulares terao a ordenacao correta apenas dentro da pagina. O PRD nao exige ordenacao global — apenas a aba de busca. Documentar no Javadoc do handler.

## Criterios de Sucesso

- Handler retorna `TitularesDemonstrativoPageResponse` com itens ordenados por nome (default)
- Filtro por `titularNome` funciona case-insensitive (ex: "silva" encontra "João Silva")
- `totalAReceber` de cada item e `totalCalculado + totalLiberado` (sem RETIDO)
- Processo inexistente lanca `NotFoundException`
- `mvn -pl distribuicao-application compile` passa sem erros
