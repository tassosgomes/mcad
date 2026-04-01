---
status: pending
parallelizable: false
blocked_by: ["4.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>external_apis, database</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Infra — OutboxPublisherWorker (BackgroundService)

## Visão Geral

Worker que executa a cada N segundos (configurável), lê eventos não publicados da outbox, publica no RabbitMQ via IRabbitMqPublisher, marca como publicado ou incrementa tentativas em caso de falha.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs`
- **Referência:**
  - `tasks/prd-eventos-cadastro/techspec.md` (seção "OutboxPublisherWorker")

## Subtarefas

- [ ] 5.1 Criar `OutboxPublisherWorker : BackgroundService`
- [ ] 5.2 ExecuteAsync loop: delay(interval) → scope → DbContext → SELECT pendentes (PublishedAt=null, Attempts<10, ORDER BY CreatedAt, TAKE 100) → foreach: BuildCloudEvent → _publisher.PublishAsync → MarcarPublicado. Catch por evento: IncrementarTentativa. SaveChanges no final do batch.
- [ ] 5.3 BuildCloudEvent: `new CloudEvent { Id=evento.Id, Source="urn:cadastro-api", Type=evento.Type, Subject=evento.Subject, Time=evento.CreatedAt, DataContentType="application/json", Data=evento.Payload }`
- [ ] 5.4 Intervalo configurável via `OUTBOX_POLL_INTERVAL_SECONDS` (default 5)
- [ ] 5.5 Logging: info "Evento publicado {Type} {Id}", warning "Falha tentativa {Attempts}", error "Erro no worker"
- [ ] 5.6 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] Worker inicia como BackgroundService
- [ ] Lê apenas eventos com PublishedAt=null e Attempts<10
- [ ] Marca PublishedAt após publicação
- [ ] Incrementa Attempts em caso de falha
- [ ] Não trava se RabbitMQ indisponível (catch + log + continua)
- [ ] Batch de 100 por ciclo
