---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>arrecadacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 3.0: PagamentoRepository — novo agregado `sumAndCountConfirmados`

## Relacionada as User Stories

- [HU-01] Calculo automatico ao registrar pagamento (direta — fonte dos dados do calculo)
- [HU-02] Recalculo automatico ao estornar pagamento (direta)

## Visao Geral

Adicionar metodo agregado ao `PagamentoRepository` que retorna `(BigDecimal totalBruto, long quantidade)` para todos os pagamentos `CONFIRMADO` de uma `(rubricaId, periodo)`. Necessario para que `VerbaServiceImpl` (task 5.0) recompute a verba sem carregar a colecao inteira.

## Requisitos

- Definir record `PagamentoAgregado(BigDecimal totalBruto, long quantidade)` no `arrecadacao-domain` (ou DTO em `arrecadacao-application` se for usado so na camada de service — preferir dominio para coesao)
- Adicionar `PagamentoAgregado sumAndCountConfirmados(UUID rubricaId, String periodo)` na interface `PagamentoRepository`
- Query JPQL que faz JOIN com `licenca` para filtrar por `rubricaId`
- Retornar `(ZERO, 0)` quando nao houver pagamentos confirmados (nao retornar null)

## Subtarefas

- [ ] 3.1 Criar record `PagamentoAgregado` no dominio
- [ ] 3.2 Adicionar metodo na interface `PagamentoRepository`
- [ ] 3.3 Adicionar query no `SpringDataPagamentoRepository` (ou implementar manualmente em `JpaPagamentoRepository` se preferir)
- [ ] 3.4 Implementar no adapter `JpaPagamentoRepository` (delega ao Spring Data)
- [ ] 3.5 Teste de integracao em `PagamentoPersistenceIT`: 3 confirmados + 1 estornado → total = soma dos 3, count = 3

## Sequenciamento

- Bloqueado por: 1.0 (precisa do schema atualizado e do dominio)
- Desbloqueia: 5.0
- Paralelizavel: Sim (independente de 2.0 e 4.0)

## Rastreabilidade

- Esta tarefa cobre: HU-01 (direta), HU-02 (direta)
- Evidencia esperada: teste de integracao com cenario com pagamentos `CONFIRMADO` e `ESTORNADO` mostrando que apenas confirmados sao somados (RF-04 / RF-07)

## Detalhes de Implementacao

JPQL (preferir interface query, evitar nativeQuery):

```java
@Query("""
    SELECT new br.com.ecad.arrecadacao.domain.aggregates.PagamentoAgregado(
        COALESCE(SUM(p.valorBruto), 0),
        COUNT(p.id))
    FROM Pagamento p
    JOIN p.licenca l
    WHERE l.rubricaId = :rubricaId
      AND p.periodo  = :periodo
      AND p.status   = 'CONFIRMADO'
    """)
PagamentoAgregado sumAndCountConfirmados(
        @Param("rubricaId") UUID rubricaId,
        @Param("periodo")  String periodo);
```

Cuidado: `Pagamento.valorBruto` esta em `DECIMAL(18,6)` — o `VerbaServiceImpl` aplicara `setScale(2, HALF_UP)` ao usar o valor.

## Criterios de Sucesso

- `mvn -pl arrecadacao-infra test -Dtest=PagamentoPersistenceIT` verde no novo cenario
- Sem alteracao de comportamento dos metodos existentes (`existsConfirmadoByLicencaIdAndPeriodo`, `findAll(spec, pg)`)
- `COALESCE` garante valor `BigDecimal.ZERO` quando nao ha pagamentos
