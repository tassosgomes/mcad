---
status: pending
parallelizable: true
blocked_by: ["5.0"]
---

<task_context>
<domain>arrecadacao/infra</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>external_apis</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: RabbitMQ — config + `DistribuicaoProcessoEventListener` (consumer)

## Relacionada as User Stories

- [HU-05] Visualizar status da verba (direta — consumer altera status `ABERTA → EM_DISTRIBUICAO → DISTRIBUIDA`)

## Visao Geral

Adicionar bindings no `RabbitMqConfig` para a exchange `distribuicao.events` e implementar `DistribuicaoProcessoEventListener` espelhando o padrao do `IdentityUserEventListener`. O consumer recebe `distribuicao.processo.iniciado` e `distribuicao.processo.finalizado` e atualiza o status da `Verba` correspondente.

**Premissa documentada:** D04 ainda nao publica esses eventos (PRD `gestao-processos`). Consumer fica pronto; lock fica latente ate D04 evoluir.

## Requisitos

- Em `RabbitMqConfig`:
  - Novo bean `distribuicaoEventsExchange` (TopicExchange `distribuicao.events`, durable=true)
  - Novo bean `distribuicaoProcessosQueue` com nome a partir de `${app.distribuicao-events.queue:arrecadacao.distribuicao.processos}`
  - Novo bean `distribuicaoProcessosBinding` com routing key `${app.distribuicao-events.routing-key:distribuicao.processo.*}`
- Em `application.yml`:
  - Bloco `app.distribuicao-events.{exchange,queue,routing-key}` com defaults e env vars (`DISTRIBUICAO_EVENTS_*`)
  - Atualizar `.env.example` na raiz com as novas variaveis
- Listener `DistribuicaoProcessoEventListener` em `arrecadacao-infra/...events/`:
  - `@RabbitListener(queues = "${app.distribuicao-events.queue}")`
  - Parse CloudEvent (mesmo padrao do `RabbitMqPublisher`, mas inverso) **ou** parse JSON cru (D04 emite CloudEvents — usar o parser CloudEvents)
  - Switch por `type`:
    - `distribuicao.processo.iniciado` → `marcarEmDistribuicao(rubricaId, periodo)`
    - `distribuicao.processo.finalizado` → `marcarDistribuida(rubricaId, periodo)`
    - default → log warning + ignorar
  - Resolver `rubricaId` via `RubricaRepository.findBySigla(payload.rubricaSigla)` — D04 emite sigla, nao UUID
  - Idempotente: se verba ja esta no status alvo, no-op silencioso (chamar `marcarEmDistribuicao` em EM_DISTRIBUICAO nao lanca)
  - Se verba nao existe para a `(rubrica, periodo)`: log warn + skip (nao criar verba via consumer — verba so eh criada por pagamento confirmado)
- Sem DLX explicito — usar comportamento default do Spring AMQP (alinhado com `IdentityUserEventListener` por decisao 2 nas questoes em aberto)
- Logs com `eventId`, `eventType`, `rubricaSigla`, `periodo`, `novoStatus`
- Contador Micrometer `arrecadacao.verba.lock.aplicado` (tag: `acao=iniciado|finalizado|ignorado`)

## Subtarefas

- [ ] 8.1 Atualizar `RabbitMqConfig` com exchange/queue/binding
- [ ] 8.2 Adicionar bloco em `application.yml` + atualizar `.env.example`
- [ ] 8.3 Criar `DistribuicaoProcessoEventListener` com parser CloudEvents e dispatch
- [ ] 8.4 Garantir idempotencia (status alvo == atual → no-op) — atencao a transicao `marcarEmDistribuicao` quando ja esta `EM_DISTRIBUICAO`
- [ ] 8.5 Adicionar suporte no `Verba` para `marcarEmDistribuicao` idempotente (revisitar task 1.0 se necessario; se ja lanca em mesmo status, ajustar para no-op)
- [ ] 8.6 Logs estruturados + contador Micrometer
- [ ] 8.7 Teste unitario com payload simulado: 3 cenarios (iniciado, finalizado, type desconhecido)
- [ ] 8.8 Teste unitario para idempotencia: receber `iniciado` duas vezes nao falha

## Sequenciamento

- Bloqueado por: 5.0 (precisa do `VerbaServiceImpl` para reuso, mas tambem pode usar `VerbaRepository` diretamente — preferir injetar `VerbaRepository` para nao circular)
- Desbloqueia: 9.0 (integration)
- Paralelizavel: Sim (independente de 6.0 e 7.0)

## Rastreabilidade

- Esta tarefa cobre: HU-05 (direta)
- Evidencia esperada: teste unitario com 3 cenarios; teste de integracao na task 9.0 publicando mensagem AMQP simulada; lock visivel via `GET /api/v1/verbas` retornando status `EM_DISTRIBUICAO`

## Detalhes de Implementacao

```java
@Component
public class DistribuicaoProcessoEventListener {

    private static final Logger LOGGER =
        LoggerFactory.getLogger(DistribuicaoProcessoEventListener.class);

    private final VerbaRepository verbaRepository;
    private final RubricaRepository rubricaRepository;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "${app.distribuicao-events.queue}")
    @Transactional
    public void onMessage(Message message) {
        try {
            CloudEventEnvelope evt = parseCloudEvent(message);
            UUID rubricaId = resolverRubricaId(evt.payload().rubricaSigla());
            if (rubricaId == null) {
                LOGGER.warn("Rubrica desconhecida; evento ignorado: {}", evt.type());
                return;
            }
            Verba verba = verbaRepository
                .findByRubricaIdAndPeriodo(rubricaId, evt.payload().periodo())
                .orElse(null);
            if (verba == null) {
                LOGGER.warn("Verba inexistente; ignorando lock para {}/{}",
                    evt.payload().rubricaSigla(), evt.payload().periodo());
                return;
            }
            switch (evt.type()) {
                case "distribuicao.processo.iniciado" -> verba.marcarEmDistribuicao();
                case "distribuicao.processo.finalizado" -> verba.marcarDistribuida();
                default -> { LOGGER.warn("Evento ignorado: {}", evt.type()); return; }
            }
            verbaRepository.save(verba);
            LOGGER.info("Lock aplicado. rubrica={} periodo={} novoStatus={}",
                evt.payload().rubricaSigla(), evt.payload().periodo(), verba.getStatus());
        } catch (Exception ex) {
            LOGGER.error("Falha processando evento de distribuicao", ex);
            throw new IllegalStateException(ex);
        }
    }
}
```

Atencao: ajustar `Verba.marcarEmDistribuicao` para **idempotencia** — se ja esta em `EM_DISTRIBUICAO`, no-op (nao lancar). Mesma logica para `marcarDistribuida` em `DISTRIBUIDA`. **Mas** retroceder (`DISTRIBUIDA → EM_DISTRIBUICAO`) continua proibido.

## Criterios de Sucesso

- Testes unitarios verdes (3 cenarios + idempotencia)
- Bean `DistribuicaoProcessoEventListener` registrado e queue declarada no startup (verificar log do Spring AMQP)
- Manualmente: publicar mensagem CloudEvents para `distribuicao.events` com routing `distribuicao.processo.iniciado` → verba muda status para `EM_DISTRIBUICAO`
- Sem erros quando D04 nao esta rodando (queue declarada, sem mensagens consumidas)
