---
status: completed
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>distribuicao/infra</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>rabbitmq</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Consumidor RabbitMQ — listener, handler e configuração

## Relacionada às User Stories

- [HU-01] Sincronização automática de rubricas (cobertura direta)

## Visão Geral

Implementar o consumidor de eventos RabbitMQ: configuração Spring AMQP (queue, exchange, bindings), listener com desserialização de CloudEvents, handler com lógica de upsert por sigla e tratamento de payload inválido. Esta é a **primeira implementação de consumidor de eventos** no projeto.

## Requisitos

- Queue `distribuicao.rubricas` durable, bound ao exchange `arrecadacao.events` com routing keys `arrecadacao.rubrica.criada` e `arrecadacao.rubrica.atualizada`
- Desserialização de envelope CloudEvents v1.0 (JSON)
- Upsert idempotente por sigla: cria se não existe, atualiza se existe
- Payload inválido (sigla ausente) descartado com log.error, sem requeue
- Logging estruturado para criação, atualização e erros

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RubricaEventPayload.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RubricaEventListener.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RubricaEventHandler.java`
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/RabbitMqConfig.java`
- **Referência:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/RabbitMqPublisher.java` (formato CloudEvents publicado)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxSeedService.java` (payload de rubrica.criada)
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/RabbitMqConfig.java` (exchange existente)
- **Skills para consultar durante implementação:**
  - `java-architecture` — separação listener/handler
  - `java-code-quality` — records, null handling, logging
  - `java-observability` — logging estruturado

## Subtarefas

- [ ] 3.1 Criar `RabbitMqConfig.java`: queue durable, exchange `arrecadacao.events` (TopicExchange), 2 bindings (`.criada` e `.atualizada`)
- [ ] 3.2 Criar `RubricaEventPayload.java` (record com sigla, nome, exigeClassificacao)
- [ ] 3.3 Criar `RubricaEventListener.java` com `@RabbitListener`: desserializar CloudEvent, extrair payload, validar, delegar ao handler
- [ ] 3.4 Criar `RubricaEventHandler.java` com `@Transactional`: lógica de upsert (findBySigla → atualizar ou criar)
- [ ] 3.5 Implementar tratamento de payload inválido: log.error + acknowledge (não requeue)
- [ ] 3.6 Implementar logging: INFO para criação/atualização, ERROR para payload inválido
- [ ] 3.7 Verificar que o projeto compila

## Sequenciamento

- Bloqueado por: 2.0 (precisa da entidade Rubrica e repositório)
- Desbloqueia: 4.0
- Paralelizável: Não (caminho crítico)

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-03, RF-04, RF-05
- Evidência esperada: consumidor processa eventos do RabbitMQ e persiste rubricas

## Detalhes de Implementação

**RabbitMqConfig.java:**
```java
@Configuration
public class RabbitMqConfig {

    @Value("${app.rabbitmq.queues.rubricas}")
    private String rubricasQueue;

    @Bean
    public Queue rubricasQueue() {
        return QueueBuilder.durable(rubricasQueue).build();
    }

    @Bean
    public TopicExchange arrecadacaoEventsExchange() {
        return ExchangeBuilder.topicExchange("arrecadacao.events")
            .durable(true).build();
    }

    @Bean
    public Binding bindRubricaCriada(Queue rubricasQueue, TopicExchange arrecadacaoEventsExchange) {
        return BindingBuilder.bind(rubricasQueue)
            .to(arrecadacaoEventsExchange)
            .with("arrecadacao.rubrica.criada");
    }

    @Bean
    public Binding bindRubricaAtualizada(Queue rubricasQueue, TopicExchange arrecadacaoEventsExchange) {
        return BindingBuilder.bind(rubricasQueue)
            .to(arrecadacaoEventsExchange)
            .with("arrecadacao.rubrica.atualizada");
    }
}
```

**RubricaEventListener.java — desserialização CloudEvents:**
```java
@Component
@Slf4j
public class RubricaEventListener {

    private final RubricaEventHandler handler;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "${app.rabbitmq.queues.rubricas}")
    public void onMessage(Message message) {
        try {
            // O RabbitMqPublisher da Arrecadação serializa o CloudEvent inteiro como body
            var cloudEvent = objectMapper.readTree(message.getBody());
            var dataNode = cloudEvent.get("data");

            if (dataNode == null) {
                log.error("Evento descartado: campo 'data' ausente. type={}",
                    cloudEvent.path("type").asText("unknown"));
                return;
            }

            var payload = objectMapper.treeToValue(dataNode, RubricaEventPayload.class);

            if (payload.sigla() == null || payload.sigla().isBlank()) {
                log.error("Evento descartado: sigla ausente. type={}",
                    cloudEvent.path("type").asText("unknown"));
                return;
            }

            handler.handle(payload);

        } catch (Exception e) {
            log.error("Erro ao processar evento de rubrica: {}", e.getMessage(), e);
            // Acknowledge implícito (DEFAULT ack mode) — não requeue
        }
    }
}
```

**RubricaEventHandler.java — upsert:**
```java
@Service
@Slf4j
public class RubricaEventHandler {

    private final RubricaRepository repository;

    @Transactional
    public void handle(RubricaEventPayload payload) {
        repository.findBySigla(payload.sigla())
            .ifPresentOrElse(
                existing -> {
                    existing.atualizar(payload.nome(), payload.exigeClassificacao());
                    log.info("Rubrica atualizada: sigla={}", payload.sigla());
                },
                () -> {
                    var rubrica = Rubrica.criar(payload.sigla(), payload.nome(), payload.exigeClassificacao());
                    repository.upsertBySigla(rubrica);
                    log.info("Rubrica sincronizada: sigla={}, nome={}", payload.sigla(), payload.nome());
                }
            );
    }
}
```

**IMPORTANTE — formato do CloudEvent publicado pela Arrecadação:**

O `RabbitMqPublisher` da arrecadação usa `io.cloudevents:cloudevents-json-jackson` para serializar. O body da mensagem é um JSON CloudEvent completo:
```json
{
  "specversion": "1.0",
  "id": "uuid",
  "source": "urn:arrecadacao-api",
  "type": "arrecadacao.rubrica.criada",
  "subject": "RADIO",
  "time": "2026-04-08T10:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "sigla": "RADIO",
    "nome": "Rádio AM/FM",
    "exigeClassificacao": false
  }
}
```

Consulte o `RabbitMqPublisher.java` da arrecadação para confirmar o formato exato antes de implementar o parser.

**Convenções da stack:**
- Separar listener (infra de transporte) do handler (lógica de negócio)
- `@Transactional` no handler, não no listener
- Logging com SLF4J: `log.info` para sucesso, `log.error` para falhas
- Records para payloads de evento (imutáveis)

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/distribuicao-api && mvn compile`
- [ ] `RabbitMqConfig` declara queue durable + exchange + 2 bindings
- [ ] `RubricaEventListener` usa `@RabbitListener` com queue configurável
- [ ] `RubricaEventHandler` é `@Transactional` e faz upsert por sigla
- [ ] Payload sem sigla é descartado com log.error (sem exceção propagada)
- [ ] Evento duplicado não gera erro nem duplica registro (idempotência)
