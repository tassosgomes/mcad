---
status: done
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>distribuicao/infra</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>rabbitmq</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Event consumers — Rol e Verba (listeners + handlers)

## Relacionada às User Stories

- [HU-01] Receber snapshots de Rol e Verba (cobertura direta)

## Visão Geral

Implementar consumidores de eventos para `identificacao.rol.fechado`, `identificacao.rol.cancelado` e `arrecadacao.verba.disponivel`. Criar queues, bindings e handlers que persistem/atualizam snapshots locais. Segue o padrão do `RubricaEventListener` (F01).

## Requisitos

- Queue `distribuicao.rol` bound a `identificacao.events` (routing keys: `identificacao.rol.fechado`, `identificacao.rol.cancelado`)
- Queue `distribuicao.verba` bound a `arrecadacao.events` (routing key: `arrecadacao.verba.disponivel`)
- RolEventHandler: upsert snapshot, marcar cancelado
- VerbaEventHandler: upsert snapshot (por rubrica+período)
- Idempotência: reprocessar mesmo evento não duplica
- Payload inválido: log.error + acknowledge

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RolEventListener.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RolEventHandler.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RolEventPayload.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/VerbaEventListener.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/VerbaEventHandler.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/VerbaEventPayload.java`
- **Modificar:**
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/RabbitMqConfig.java` (queues, exchange identificacao, bindings)
  - `services/distribuicao-api/distribuicao-api/src/main/resources/application.yml` (queue names)
- **Referência:**
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RubricaEventListener.java` (padrão F01)

## Subtarefas

- [x] 3.1 Criar RolEventPayload (record: rubricaSigla, periodo, captacaoId, totalExecucoes, payload JSON)
- [x] 3.2 Criar RolEventHandler (@Transactional, upsert snapshot, marcar cancelado)
- [x] 3.3 Criar RolEventListener (@RabbitListener, parse CloudEvent, delega ao handler)
- [x] 3.4 Criar VerbaEventPayload (record: rubricaSigla, periodo, valorBruto, deducoes, verbaLiquida)
- [x] 3.5 Criar VerbaEventHandler (@Transactional, upsert por rubrica+período)
- [x] 3.6 Criar VerbaEventListener (@RabbitListener, parse CloudEvent, delega ao handler)
- [x] 3.7 Adicionar queues, exchange identificacao e bindings ao RabbitMqConfig
- [x] 3.8 Adicionar queue names ao application.yml
- [x] 3.9 Verificar compilação

## Sequenciamento

- Bloqueado por: 1.0 (entidades Snapshot + repositórios)
- Desbloqueia: 4.0 (commands consultam snapshots)
- Paralelizável: Sim, com 2.0

## Detalhes de Implementação

**RolEventHandler** — distingue entre `fechado` e `cancelado` pelo type do CloudEvent:
```java
@Transactional
public void handleRolFechado(RolEventPayload payload) {
    repository.findByRubricaAndPeriodoAndCaptacaoId(payload.rubricaSigla(), payload.periodo(), payload.captacaoId())
        .ifPresentOrElse(
            existing -> { existing.atualizar(payload); log.info("Snapshot Rol atualizado: ..."); },
            () -> { repository.save(SnapshotRol.criar(payload)); log.info("Snapshot Rol recebido: ..."); }
        );
}

@Transactional
public void handleRolCancelado(RolEventPayload payload) {
    repository.findByRubricaAndPeriodoNaoCancelado(payload.rubricaSigla(), payload.periodo())
        .ifPresent(snapshot -> {
            snapshot.marcarCancelado();
            log.warn("Snapshot Rol cancelado: rubrica={}, periodo={}", payload.rubricaSigla(), payload.periodo());
        });
}
```

**RabbitMqConfig additions:**
```java
@Bean public Queue rolQueue() { return QueueBuilder.durable("distribuicao.rol").build(); }
@Bean public Queue verbaQueue() { return QueueBuilder.durable("distribuicao.verba").build(); }
@Bean public TopicExchange identificacaoEventsExchange() { return ExchangeBuilder.topicExchange("identificacao.events").durable(true).build(); }
@Bean public Binding bindRolFechado() { return BindingBuilder.bind(rolQueue()).to(identificacaoEventsExchange()).with("identificacao.rol.fechado"); }
@Bean public Binding bindRolCancelado() { return BindingBuilder.bind(rolQueue()).to(identificacaoEventsExchange()).with("identificacao.rol.cancelado"); }
@Bean public Binding bindVerbaDisponivel() { return BindingBuilder.bind(verbaQueue()).to(arrecadacaoEventsExchange()).with("arrecadacao.verba.disponivel"); }
```

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/distribuicao-api && mvn compile`
- [x] RabbitMqConfig declara 2 queues, 1 exchange novo, 3 bindings
- [x] RolEventListener distingue `rol.fechado` de `rol.cancelado`
- [x] VerbaEventHandler faz upsert por rubrica+período
- [x] Payload inválido logado e descartado sem exceção
