---
status: pending
parallelizable: false
blocked_by: ["2.0", "3.0", "4.0"]
---

<task_context>
<domain>arrecadacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database,external_apis</dependencies>
<unblocks>"6.0, 7.0, 8.0"</unblocks>
</task_context>

# Tarefa 5.0: `VerbaServiceImpl` — calculo, upsert e publicacao de evento Outbox

## Relacionada as User Stories

- [HU-01] Calculo automatico ao registrar pagamento (direta — coracao do calculo)
- [HU-02] Recalculo automatico ao estornar pagamento (direta)
- [HU-05] Visualizar status da verba (suporte — preserva status no recalculo)

## Visao Geral

Substituir `VerbaServiceNoOp` por `VerbaServiceImpl` real: implementa `validarLockParaAlteracao` (lookup + verificacao de status) e `recalcularVerba` (upsert + evento Outbox `arrecadacao.verba.disponivel` com subject `{rubricaSigla}:{periodo}`). Coracao do F05. Deve operar em `@Transactional` com lock pessimista para serializar recalculos concorrentes.

## Requisitos

- Componente Spring `@Component` em `arrecadacao-infra/...services/`
- Remover ou marcar como `@Primary`-conflict a `VerbaServiceNoOp` (decisao: **remover** a NoOp para evitar duas implementacoes)
- `validarLockParaAlteracao(rubricaId, periodo)`:
  - Buscar verba por `(rubricaId, periodo)` — se nao existir, retornar sem erro (primeiro pagamento da chave)
  - Se status `!= ABERTA`, lancar `VerbaEmDistribuicaoException` com mensagem "Verba da rubrica {sigla} periodo {periodo} esta {status} e nao pode ser alterada"
- `recalcularVerba(rubricaId, periodo)`:
  - Buscar com `findByRubricaIdAndPeriodoForUpdate` (lock pessimista)
  - Se nao existe: criar com `Verba.abrir(rubricaId, periodo)`
  - Buscar agregado via `pagamentoRepository.sumAndCountConfirmados(...)` (task 3.0)
  - `verba.recalcular(novoBruto, qtdPagamentos)` (task 1.0)
  - `verbaRepository.save(verba)`
  - Publicar evento Outbox `arrecadacao.verba.disponivel`
- Subject do evento: `{rubricaSigla}:{periodo}` — buscar nome/sigla da rubrica em cache local (`RubricaRepository.findById`)
- Payload conforme RF-09: `rubricaSigla`, `rubricaNome`, `periodo`, `valorBrutoTotal`, `deducaoEcad`, `deducaoAssociacoes`, `verbaLiquida`, `quantidadePagamentos`, `status`
- Evento emitido **mesmo com verba zerada** apos estorno total (RF-10)
- Em retry idempotente: chamar `recalcularVerba` duas vezes deve produzir o mesmo estado final + 2 eventos Outbox (cada um valido)
- Anotacao `@Transactional` para garantir lock + outbox na mesma unidade

## Subtarefas

- [ ] 5.1 Criar `VerbaServiceImpl` com `@Component` e construtor com deps: `VerbaRepository`, `PagamentoRepository`, `RubricaRepository`, `OutboxEventWriter`
- [ ] 5.2 Implementar `validarLockParaAlteracao` (lookup sem lock + guard)
- [ ] 5.3 Implementar `recalcularVerba` (lock + agregado + upsert + outbox)
- [ ] 5.4 Construir payload do evento com `BigDecimal.toPlainString()` (padrao do projeto)
- [ ] 5.5 Logs SLF4J estruturados com `rubricaId`, `periodo`, `valorBrutoTotal`, `quantidadePagamentos`, `acao=criar|atualizar`
- [ ] 5.6 Adicionar counters Micrometer: `arrecadacao.verba.recalculo` (tags: `rubrica`, `resultado=ok|locked`), `arrecadacao.verba.evento.publicado`
- [ ] 5.7 Remover `VerbaServiceNoOp` e referencias em `VerbaServiceTestConfig`
- [ ] 5.8 Testes unitarios `VerbaServiceImplTest` com mocks: criar inicial, atualizar existente, lock bloqueia recalculo, primeiro pagamento (verba nao existe) → cria, estorno total → verba zerada com evento

## Sequenciamento

- Bloqueado por: 2.0 (repository), 3.0 (sum agregado), 4.0 (interface refatorada)
- Desbloqueia: 6.0, 7.0, 8.0
- Paralelizavel: Nao (caminho critico)

## Rastreabilidade

- Esta tarefa cobre: HU-01 (direta), HU-02 (direta), HU-05 (suporte)
- Evidencia esperada: testes unitarios verdes; manual via `arrecadacao.outbox_events` mostra evento serializado; metrica `arrecadacao.verba.recalculo` visivel no `/actuator/metrics`

## Detalhes de Implementacao

```java
@Component
public class VerbaServiceImpl implements VerbaService {

    private final VerbaRepository verbaRepository;
    private final PagamentoRepository pagamentoRepository;
    private final RubricaRepository rubricaRepository;
    private final OutboxEventWriter outboxEventWriter;

    @Override
    @Transactional
    public void validarLockParaAlteracao(UUID rubricaId, String periodo) {
        verbaRepository.findByRubricaIdAndPeriodo(rubricaId, periodo)
            .filter(v -> v.getStatus() != StatusVerba.ABERTA)
            .ifPresent(v -> {
                Rubrica r = rubricaRepository.findById(rubricaId).orElseThrow();
                throw new VerbaEmDistribuicaoException(
                    "Verba da rubrica %s periodo %s esta %s e nao pode ser alterada"
                        .formatted(r.getSigla(), periodo, v.getStatus()));
            });
    }

    @Override
    @Transactional
    public void recalcularVerba(UUID rubricaId, String periodo) {
        Verba verba = verbaRepository
            .findByRubricaIdAndPeriodoForUpdate(rubricaId, periodo)
            .orElseGet(() -> Verba.abrir(rubricaId, periodo));

        PagamentoAgregado ag = pagamentoRepository
            .sumAndCountConfirmados(rubricaId, periodo);

        verba.recalcular(ag.totalBruto(), (int) ag.quantidade());
        verba = verbaRepository.save(verba);

        Rubrica rubrica = rubricaRepository.findById(rubricaId).orElseThrow();
        outboxEventWriter.addEvent(
            "arrecadacao.verba.disponivel",
            "%s:%s".formatted(rubrica.getSigla(), periodo),
            buildEventPayload(verba, rubrica));
    }
}
```

Atencao: `verba.recalcular` lanca `VerbaEmDistribuicaoException` quando status `!= ABERTA` — defesa em profundidade (`validarLockParaAlteracao` ja deve barrar antes, mas se chamado isolado sem lock, o domain method protege).

## Criterios de Sucesso

- `VerbaServiceNoOp` removida do projeto
- `VerbaServiceImpl` registrada como bean unico
- Teste unitario cobre 100% dos branches do `recalcularVerba` (5 cenarios mininos)
- Evento Outbox visivel via SQL: `SELECT * FROM arrecadacao.outbox_events WHERE type='arrecadacao.verba.disponivel'`
- Logs estruturados saem em JSON quando profile `prod` ou logback configurado
