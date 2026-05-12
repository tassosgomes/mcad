---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>arrecadacao/domain+application</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>none</dependencies>
<unblocks>"5.0, 8.0"</unblocks>
</task_context>

# Tarefa 4.0: Refatorar interface `VerbaService` + atualizar `EstornarPagamentoCommandHandler`

## Relacionada as User Stories

- [HU-02] Recalculo automatico ao estornar pagamento (direta — adapta o handler de estorno)
- [HU-01] Calculo automatico ao registrar pagamento (suporte — habilita reuso em F04)

## Visao Geral

Unificar o lock entre F04 (pagamento) e F06 (estorno): renomear `validarLockParaEstorno(licencaId, periodo)` → `validarLockParaAlteracao(rubricaId, periodo)` e `recalcularVerba(rubricaSigla, periodo)` → `recalcularVerba(rubricaId, periodo)`. Atualizar `EstornarPagamentoCommandHandler` para usar `pagamento.getLicenca().getRubricaId()` em vez de `licencaId`. F06 ainda nao foi implementado totalmente — alterar agora minimiza retrabalho.

## Requisitos

- Interface `VerbaService` final:
  - `void validarLockParaAlteracao(UUID rubricaId, String periodo);`
  - `void recalcularVerba(UUID rubricaId, String periodo);`
- `VerbaServiceNoOp` ajustada para a nova assinatura (sera substituida na task 5.0 — manter no-op funcional para nao quebrar o build)
- `EstornarPagamentoCommandHandler.handle(...)`:
  - Passo 2: `verbaService.validarLockParaAlteracao(pagamento.getLicenca().getRubricaId(), pagamento.getPeriodo())`
  - Passo 5: `verbaService.recalcularVerba(pagamento.getLicenca().getRubricaId(), pagamento.getPeriodo())`
  - Manter `rubricaSigla` apenas no payload do evento `arrecadacao.pagamento.estornado` (compatibilidade publica)
- `EstornarPagamentoCommandHandlerTest` atualizado: mocks usam a nova assinatura

## Subtarefas

- [ ] 4.1 Refatorar interface `VerbaService` (renomear metodos, ajustar parametros)
- [ ] 4.2 Atualizar `VerbaServiceNoOp` (no-op com nova assinatura, sera removida na 5.0)
- [ ] 4.3 Atualizar `EstornarPagamentoCommandHandler` para passar `rubricaId`
- [ ] 4.4 Atualizar `EstornarPagamentoCommandHandlerTest` (mocks de `VerbaService`)
- [ ] 4.5 `VerbaServiceTestConfig` ajustado se referenciar a assinatura antiga
- [ ] 4.6 Compilar todo o servico: `mvn -pl arrecadacao-api compile`

## Sequenciamento

- Bloqueado por: 1.0 (precisa do `StatusVerba` ja disponivel se o NoOp tiver referencia tipada)
- Desbloqueia: 5.0, 8.0 (consumer usa a mesma forma de identificar verba)
- Paralelizavel: Sim (independente de 2.0 e 3.0)

## Rastreabilidade

- Esta tarefa cobre: HU-02 (direta)
- Evidencia esperada: build verde do servico inteiro; `EstornarPagamentoCommandHandlerTest` continua passando; assinaturas atualizadas em produto e testes; nenhuma referencia ao metodo antigo no codigo

## Detalhes de Implementacao

```java
public interface VerbaService {
    /**
     * Bloqueia alteracao quando verba esta EM_DISTRIBUICAO ou DISTRIBUIDA.
     * Chamado por RegistrarPagamento (F04) e EstornarPagamento (F06).
     * Lanca VerbaEmDistribuicaoException (HTTP 422).
     */
    void validarLockParaAlteracao(UUID rubricaId, String periodo);

    /**
     * Recalcula valor bruto, deducoes e liquida; publica
     * arrecadacao.verba.disponivel via Outbox. Idempotente em retry.
     */
    void recalcularVerba(UUID rubricaId, String periodo);
}
```

No handler de estorno:

```java
// 2. Validar lock — antes era licencaId, agora rubricaId
UUID rubricaId = pagamento.getLicenca().getRubricaId();
verbaService.validarLockParaAlteracao(rubricaId, pagamento.getPeriodo());

// 5. Recalcular — antes era rubricaSigla, agora rubricaId
verbaService.recalcularVerba(rubricaId, pagamento.getPeriodo());

// Manter rubricaSigla apenas no payload do evento (compatibilidade publica)
String rubricaSigla = pagamento.getLicenca().getRubrica().getSigla();
outboxEventWriter.addEvent("arrecadacao.pagamento.estornado",
    pagamento.getId().toString(),
    buildEventPayload(pagamento, rubricaSigla));
```

## Criterios de Sucesso

- `grep -r "validarLockParaEstorno" services/arrecadacao-api` retorna zero resultados
- Build do servico inteiro verde
- `EstornarPagamentoCommandHandlerTest` passa sem mudanca de comportamento (apenas mocks)
- Coordenacao com PRD `estorno-pagamento`: anotar no PRD que a refatoracao foi aplicada (responsavel do F06 atualizara seu PRD)
