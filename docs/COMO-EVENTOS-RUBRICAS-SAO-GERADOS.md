# Como Eventos de Rubricas São Gerados — ECAD

## 📊 Fluxo de Geração de Eventos de Rubricas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     INICIALIZAÇÃO DO SERVIÇO (Arrecadação)                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. MIGRAÇÃO FLYWAY — V2__seed_rubricas.sql
   ↓
   INSERT INTO arrecadacao.rubricas (id, sigla, nome, exige_classificacao) VALUES
   - ('...', 'RADIO', 'Rádio AM/FM', FALSE),
   - ('...', 'TV_ABERTA', 'TV Aberta', TRUE),
   - ('...', 'TV_FECHADA', 'TV Fechada', TRUE),
   - ('...', 'CINEMA', 'Cinema', TRUE),
   - ('...', 'VOD', 'Streaming Vídeo (VOD)', TRUE),
   - ('...', 'STREAMING_AUDIO', 'Streaming Áudio', FALSE),
   - ('...', 'SHOW', 'Show', FALSE)


2. APLICAÇÃO PRONTA — ApplicationReadyEvent
   ↓
   OutboxSeedService.publishPendingRubricaEvents() é executado
   ↓
   Para cada rubrica no banco de dados:
   ├─ Verifica se evento arrecadacao.rubrica.criada já foi publicado (evita duplicação)
   └─ Se NÃO foi publicado:
      └─ INSERE evento na tabela arrecadacao.outbox_events com:
         - type: "arrecadacao.rubrica.criada"
         - subject: UUID da rubrica
         - payload: { sigla, nome, exigeClassificacao }


3. OUTBOX POLLER — Agendado a cada 5 segundos (configurável)
   ↓
   OutboxPublisherWorker.publishPendingEvents() é executado
   ↓
   Para cada evento PENDENTE na tabela outbox_events:
   ├─ Publica no RabbitMQ com:
   │  - Queue: distribuicao.rubricas (configurável)
   │  - Payload: CloudEvent com data contendo sigla, nome, exigeClassificacao
   │
   └─ Marca evento como PUBLICADO na tabela (idempotência)


┌─────────────────────────────────────────────────────────────────────────────┐
│              CONSUMO DO EVENTO (Distribuição) — RabbitMQ                      │
└─────────────────────────────────────────────────────────────────────────────┘

4. RabbitMQ Queue: distribuicao.rubricas
   ↓
   RubricaEventListener.onMessage() ouve a fila
   ↓
   Valida payload:
   ├─ Campo "data" presente?
   ├─ Sigla não-vazia?
   └─ Nome não-vazio?
   ↓
   RubricaEventHandler.handle(RubricaEventPayload)
   ↓
   INSERE/ATUALIZA rubrica no schema distribuicao.rubricas:
   - sigla (chave natural — upsert por sigla)
   - nome
   - exige_classificacao
```

---

## 🔄 Detalhes Técnicos por Componente

### 1️⃣ **Seed de Rubricas (Arrecadação)**

**Arquivo:** `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V2__seed_rubricas.sql`

```sql
INSERT INTO arrecadacao.rubricas (id, sigla, nome, exige_classificacao) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RADIO', 'Rádio AM/FM', FALSE),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'TV_ABERTA', 'TV Aberta', TRUE),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'TV_FECHADA', 'TV Fechada', TRUE),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'CINEMA', 'Cinema', TRUE),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'VOD', 'Streaming Vídeo (VOD)', TRUE),
    ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'STREAMING_AUDIO', 'Streaming Áudio', FALSE),
    ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'SHOW', 'Show', FALSE)
ON CONFLICT (sigla) DO NOTHING;
```

**Quando executado:**
- Durante a inicialização do banco (primeira vez que migração é rodada)
- Ou manualmente via `docker exec` ou script SQL

---

### 2️⃣ **Publicação de Eventos (OutboxSeedService)**

**Arquivo:** `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxSeedService.java`

```java
@Component
public class OutboxSeedService {

    static final String RUBRICA_CRIADA_EVENT_TYPE = "arrecadacao.rubrica.criada";

    @EventListener(ApplicationReadyEvent.class)  // ← Executado quando app está pronta
    @Transactional
    public void publishPendingRubricaEvents() {
        int createdEvents = 0;

        for (Rubrica rubrica : rubricaRepository.findAll()) {
            String subject = rubrica.getId().toString();
            
            // Evita duplicação — verifica se evento já foi publicado
            if (outboxEventRepository.existsByTypeAndSubject(RUBRICA_CRIADA_EVENT_TYPE, subject)) {
                continue;
            }

            // Insere evento na tabela outbox_events
            outboxEventWriter.addEvent(
                    RUBRICA_CRIADA_EVENT_TYPE,
                    subject,
                    new RubricaCreatedPayload(
                            rubrica.getSigla(),
                            rubrica.getNome(),
                            rubrica.isExigeClassificacao()));
            createdEvents++;
        }

        LOGGER.info("Outbox seed completed. createdEvents={}", createdEvents);
    }

    public record RubricaCreatedPayload(String sigla, String nome, boolean exigeClassificacao) { }
}
```

**Quando executado:**
- Automaticamente quando a aplicação Arrecadação inicia
- Após migração V2__seed_rubricas.sql ter inserido as 7 rubricas
- **Apenas uma vez por rubrica** (idempotência por subject)

---

### 3️⃣ **Outbox Poller (OutboxPublisherWorker)**

**Arquivo:** `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxPublisherWorker.java`

```java
@Component
public class OutboxPublisherWorker {

    @Scheduled(fixedDelayString = "${app.outbox.publisher.poll-interval-ms:5000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findPending(100);
        
        for (OutboxEvent pendingEvent : pendingEvents) {
            try {
                rabbitMqPublisher.publish(pendingEvent);  // ← Envia ao RabbitMQ
                pendingEvent.marcarPublicado();           // ← Marca como enviado
            } catch (Exception exception) {
                pendingEvent.incrementarTentativa();      // ← Retry logic
                LOGGER.warn("Failed to publish outbox event. attempts={}", 
                    pendingEvent.getAttempts(), exception);
            }
        }
    }
}
```

**Quando executado:**
- A cada 5 segundos (configurável via `app.outbox.publisher.poll-interval-ms`)
- Busca até 100 eventos PENDENTES
- Para cada evento, tenta enviar ao RabbitMQ
- Se sucesso: marca como PUBLICADO (idempotência)
- Se erro: incrementa tentativas (máximo configurável)

---

### 4️⃣ **Consumidor de Eventos (RubricaEventListener)**

**Arquivo:** `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RubricaEventListener.java`

```java
@Component
public class RubricaEventListener {

    @RabbitListener(queues = "${app.rabbitmq.queues.rubricas}")
    public void onMessage(Message message) {
        try {
            // Parse CloudEvent
            JsonNode cloudEventNode = objectMapper.readTree(message.getBody());
            JsonNode dataNode = cloudEventNode.path("data");

            // Validações
            if (dataNode.isMissingNode() || dataNode.isNull()) {
                LOGGER.error("Evento de rubrica descartado: campo data ausente");
                return;
            }

            RubricaEventPayload payload = objectMapper.treeToValue(dataNode, RubricaEventPayload.class);
            
            if (payload.sigla() == null || payload.sigla().isBlank()) {
                LOGGER.error("Evento de rubrica descartado: sigla ausente");
                return;
            }

            // Processa evento
            rubricaEventHandler.handle(payload);
        } catch (Exception exception) {
            LOGGER.error("Erro ao processar evento de rubrica", exception);
        }
    }
}
```

**Quando executado:**
- Continuamente, escutando a fila RabbitMQ `distribuicao.rubricas`
- Valida payload (sigla e nome obrigatórios)
- Delega para `RubricaEventHandler` para persistência

---

## 🚨 O Que Pode Dar Errado

| Cenário | Sintoma | Causa | Solução |
|---------|---------|-------|---------|
| Rubricas não sincronizadas | Tela de Distribuição mostra "Nenhuma rubrica sincronizada" | OutboxSeedService não foi executado ou RabbitMQ offline | Verificar logs de Arrecadação, reiniciar serviços |
| Eventos não publicados | Tabela `arrecadacao.outbox_events` acumula eventos PENDENTES | OutboxPublisherWorker está desabilitado ou RabbitMQ desconectado | Verificar se `@Scheduled` está ativo, verificar RabbitMQ |
| Consumidor não ouve | Eventos em RabbitMQ mas não sincronizados em Distribuição | `RubricaEventListener` offline ou fila não configurada | Verificar se Distribuição está running, validar `app.rabbitmq.queues.rubricas` |
| Duplicação de rubricas | Tabela `distribuicao.rubricas` com múltiplas linhas iguais | Consumidor sem `UPSERT` por sigla | Verificar `RubricaEventHandler` — deve usar upsert, não insert |

---

## 🔍 Como Debugar

### 1. Verificar se rubricas estão no banco de Arrecadação

```bash
docker exec -it $(docker ps -f name=postgres -q) psql -U mcad -d mcad -c "SELECT * FROM arrecadacao.rubricas LIMIT 10;"
```

**Esperado:** 7 linhas com sigla, nome, exige_classificacao

### 2. Verificar se eventos estão em Outbox

```bash
docker exec -it $(docker ps -f name=postgres -q) psql -U mcad -d mcad -c "SELECT id, type, subject, published_at, attempts FROM arrecadacao.outbox_events WHERE type = 'arrecadacao.rubrica.criada';"
```

**Esperado:** 7 linhas com `published_at IS NOT NULL` (eventos já enviados)

**Se `published_at IS NULL`:** Outbox poller não está funcionando. Verificar:
- Se Arrecadação está rodando
- Se RabbitMQ está conectável
- Logs: `docker logs $(docker ps -f name=arrecadacao -q)`

### 3. Verificar se eventos chegaram no RabbitMQ

```bash
docker exec -it $(docker ps -f name=rabbitmq -q) rabbitmqctl list_queues name messages
```

**Esperado:** Fila `distribuicao.rubricas` com 0 mensagens (já consumidas)

### 4. Verificar se rubricas foram sincronizadas em Distribuição

```bash
docker exec -it $(docker ps -f name=postgres -q) psql -U mcad -d mcad -c "SELECT * FROM distribuicao.rubricas LIMIT 10;"
```

**Esperado:** 7 linhas com sigla, nome, exige_classificacao

**Se vazio:** Consumidor não foi executado. Verificar:
- Se Distribuição está rodando
- Se fila `distribuicao.rubricas` foi criada no RabbitMQ
- Logs: `docker logs $(docker ps -f name=distribuicao -q)`

### 5. Ver logs em tempo real

```bash
# Logs da Arrecadação
docker logs -f $(docker ps -f name=arrecadacao -q) | grep -i "rubrica\|outbox"

# Logs da Distribuição
docker logs -f $(docker ps -f name=distribuicao -q) | grep -i "rubrica"
```

---

## ✅ Checklist de Sincronização

- [ ] **Docker compose up**: Todos os serviços rodando (postgres, rabbitmq, arrecadacao, distribuicao)
- [ ] **Migrações executadas**: `SELECT version FROM flyway_schema_history WHERE description LIKE '%seed_rubricas%';` retorna versão 2
- [ ] **Rubricas no banco Arrecadação**: `SELECT COUNT(*) FROM arrecadacao.rubricas;` retorna 7
- [ ] **Eventos criados**: `SELECT COUNT(*) FROM arrecadacao.outbox_events WHERE type = 'arrecadacao.rubrica.criada';` retorna 7
- [ ] **Eventos publicados**: `SELECT COUNT(*) FROM arrecadacao.outbox_events WHERE published_at IS NOT NULL;` retorna 7
- [ ] **Rubricas sincronizadas**: `SELECT COUNT(*) FROM distribuicao.rubricas;` retorna 7
- [ ] **UI da Distribuição**: Mostra lista de 7 rubricas (não "Nenhuma rubrica sincronizada")

---

## 📝 Resumo

**Não há tela de cadastro de rubricas porque:**

1. ✅ **Rubricas são master data** — Criadas via migração SQL (seed)
2. ✅ **Event-driven** — Arrecadação publica eventos que Distribuição consome
3. ✅ **Sincronização automática** — Sem intervenção manual necessária
4. ✅ **Idempotência** — Eventos são processados uma única vez (upsert por sigla)

**O fluxo é:**
```
V2__seed_rubricas.sql 
  → OutboxSeedService (insere em outbox_events) 
  → OutboxPublisherWorker (envia ao RabbitMQ cada 5s) 
  → RubbitMQ fila distribuicao.rubricas 
  → RubricaEventListener (consome e sincroniza)
  → distribuicao.rubricas (cópia local)
```

**Tempo esperado:** Menos de 10 segundos do bootstrap até todas as 7 rubricas sincronizadas.

---

**Documento criado em:** 2026-06-04
