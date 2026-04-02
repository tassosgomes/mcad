# Tech Spec — F08: Eventos de Cadastro

> **PRD:** `tasks/prd-eventos-cadastro/prd.md`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F08
> **Data:** 2026-04-01

---

## Resumo Executivo

Esta Tech Spec cobre a implementação da publicação de eventos do domínio Cadastro via RabbitMQ com **Outbox Pattern** e formato **CloudEvents 1.0**. Introduz: interface `IEventPublisher` no Domain, tabela `outbox_events` no schema cadastro, `OutboxEventWriter` que salva eventos na mesma transação da entidade, `OutboxPublisherWorker` (BackgroundService) que lê a outbox e publica no RabbitMQ, e integração nos 8 handlers existentes que disparam eventos.

É uma feature 100% backend, sem novos endpoints REST, sem impacto no frontend. O RabbitMQ é externo (já existente, não Docker Compose).

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `dotnet-architecture` | Domain Events, Outbox Pattern, BackgroundService |
| `dotnet-dependency-config` | RabbitMQ.Client, CloudNative.CloudEvents |
| `dotnet-observability` | Logging do worker, métricas de publicação |
| `dotnet-testing` | Testes do outbox writer, mock do RabbitMQ |

---

## Arquitetura do Sistema

### Visão Geral

```
                                    ┌─────────────────┐
Handler executa ação ──────────────→│  SaveChanges()  │
  (ex: LiberarObra)                 │  (transação)    │
         │                          │                 │
         │ OutboxEventWriter        │  Entidade ──────│──→ tabela obras_musicais
         │ .AddEvent(...)           │  Outbox ────────│──→ tabela outbox_events
         │                          └─────────────────┘
         │                                   │
         │                          ┌────────▼────────┐
         │                          │ OutboxPublisher  │ (BackgroundService, 5s)
         │                          │    Worker        │
         │                          │                  │
         │                          │  1. SELECT não   │
         │                          │     publicados   │
         │                          │  2. Publish      │──→ RabbitMQ
         │                          │     RabbitMQ     │    exchange: cadastro.events
         │                          │  3. UPDATE       │    routing: cadastro.obra.liberada
         │                          │     published_at │
         │                          └──────────────────┘
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Outbox Pattern (não fire-and-forget) | Garantia transacional: evento nunca se perde se DB commit ok |
| `IOutboxEventWriter` no Domain (interface) | Domain não conhece RabbitMQ — apenas sabe que precisa publicar |
| `OutboxEventWriter` no Infra | Implementação salva na tabela outbox via DbContext |
| `OutboxPublisherWorker` como BackgroundService | Desacoplado do request HTTP — publica assincronamente |
| CloudEvents via `CloudNative.CloudEvents` | Serialização padrão, interoperável, sem envelope customizado |
| Exchange topic (não fanout/direct) | Permite consumers se inscreverem por padrão (routing key wildcard) |
| RabbitMQ externo (não Docker Compose) | Já existente, connection string via .env |

---

## Design de Implementação

### Interface IOutboxEventWriter (Domain Layer)

```csharp
// 3-Domain/Cadastro.Domain/Interfaces/IOutboxEventWriter.cs
public interface IOutboxEventWriter
{
    void AddEvent(string eventType, string subject, object data);
}
```

> **Nota:** Domain não conhece CloudEvents nem RabbitMQ. Apenas declara que quer publicar um evento com tipo, subject (entity ID) e data (payload). A implementação no Infra cuida do formato.

### Entidade OutboxEvent (Domain Layer)

```csharp
// 3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs
public class OutboxEvent
{
    public Guid Id { get; private set; }
    public string Type { get; private set; }        // cadastro.obra.liberada
    public string RoutingKey { get; private set; }   // cadastro.obra.liberada
    public string Subject { get; private set; }      // entity ID
    public string Payload { get; private set; }      // JSON data
    public DateTime CreatedAt { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public int Attempts { get; private set; }

    private OutboxEvent() { }

    public static OutboxEvent Criar(string type, string subject, string payload)
    {
        return new OutboxEvent
        {
            Id = Guid.NewGuid(),
            Type = type,
            RoutingKey = type, // routing key = event type
            Subject = subject,
            Payload = payload,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = null,
            Attempts = 0,
        };
    }

    public void MarcarPublicado()
    {
        PublishedAt = DateTime.UtcNow;
    }

    public void IncrementarTentativa()
    {
        Attempts++;
    }

    public bool ExcedeuTentativas => Attempts >= 10;
}
```

### OutboxEventWriter (Infra Layer)

```csharp
// 4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs
public class OutboxEventWriter : IOutboxEventWriter
{
    private readonly CadastroDbContext _context;

    public OutboxEventWriter(CadastroDbContext context) => _context = context;

    public void AddEvent(string eventType, string subject, object data)
    {
        var payload = JsonSerializer.Serialize(data);
        var outboxEvent = OutboxEvent.Criar(eventType, subject, payload);
        _context.OutboxEvents.Add(outboxEvent);
        // Será persistido no mesmo SaveChanges() do handler
    }
}
```

### OutboxPublisherWorker (Infra Layer — BackgroundService)

```csharp
// 4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs
public class OutboxPublisherWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IRabbitMqPublisher _publisher;
    private readonly ILogger<OutboxPublisherWorker> _logger;
    private readonly TimeSpan _interval;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<CadastroDbContext>();

                var pendentes = await context.OutboxEvents
                    .Where(e => e.PublishedAt == null && !e.ExcedeuTentativas)
                    .OrderBy(e => e.CreatedAt)
                    .Take(100) // batch
                    .ToListAsync(stoppingToken);

                foreach (var evento in pendentes)
                {
                    try
                    {
                        var cloudEvent = BuildCloudEvent(evento);
                        await _publisher.PublishAsync(evento.RoutingKey, cloudEvent, stoppingToken);
                        evento.MarcarPublicado();
                        _logger.LogInformation("Evento {EventType} publicado: {EventId}", evento.Type, evento.Id);
                    }
                    catch (Exception ex)
                    {
                        evento.IncrementarTentativa();
                        _logger.LogWarning(ex, "Falha ao publicar evento {EventId}, tentativa {Attempts}", evento.Id, evento.Attempts);
                    }
                }

                await context.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no OutboxPublisherWorker");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private CloudEvent BuildCloudEvent(OutboxEvent evento)
    {
        return new CloudEvent
        {
            Id = evento.Id.ToString(),
            Source = new Uri("urn:cadastro-api"),
            Type = evento.Type,
            Subject = evento.Subject,
            Time = evento.CreatedAt,
            DataContentType = "application/json",
            Data = evento.Payload,
        };
    }
}
```

### IRabbitMqPublisher (Infra Layer)

```csharp
// 4-Infra/Cadastro.Infra/Events/IRabbitMqPublisher.cs
public interface IRabbitMqPublisher
{
    Task PublishAsync(string routingKey, CloudEvent cloudEvent, CancellationToken ct);
}

// 4-Infra/Cadastro.Infra/Events/RabbitMqPublisher.cs
public class RabbitMqPublisher : IRabbitMqPublisher, IDisposable
{
    private readonly IConnection _connection;
    private readonly IChannel _channel;
    private const string Exchange = "cadastro.events";

    public RabbitMqPublisher(IConfiguration configuration)
    {
        var factory = new ConnectionFactory
        {
            Uri = new Uri(configuration["RABBITMQ_URL"] ?? "amqp://guest:guest@localhost:5672")
        };
        _connection = factory.CreateConnectionAsync().Result;
        _channel = _connection.CreateChannelAsync().Result;
        _channel.ExchangeDeclareAsync(Exchange, ExchangeType.Topic, durable: true).Wait();
    }

    public async Task PublishAsync(string routingKey, CloudEvent cloudEvent, CancellationToken ct)
    {
        var formatter = new JsonEventFormatter();
        var body = formatter.EncodeStructuredModeMessage(cloudEvent, out var contentType);

        var props = new BasicProperties
        {
            MessageId = cloudEvent.Id,
            ContentType = contentType.MediaType,
            DeliveryMode = DeliveryModes.Persistent,
        };

        await _channel.BasicPublishAsync(Exchange, routingKey, false, props, body, ct);
    }
}
```

### Integração nos Handlers Existentes

Cada handler que dispara evento recebe `IOutboxEventWriter` via DI e chama `AddEvent` antes do `SaveChangesAsync`:

```csharp
// Exemplo: LiberarObraCommandHandler (F07) — MODIFICAR
public class LiberarObraCommandHandler : ICommandHandler<LiberarObraCommand, ObraResponse>
{
    private readonly IObraRepository _obraRepo;
    private readonly IOutboxEventWriter _outbox; // NOVO

    public async Task<ObraResponse> HandleAsync(LiberarObraCommand cmd, CancellationToken ct)
    {
        // ... validação de pré-requisitos existente ...
        obra.Liberar();

        // NOVO: registrar evento na outbox (mesma transação)
        _outbox.AddEvent("cadastro.obra.liberada", obra.Id.ToString(), new
        {
            obraId = obra.Id,
            titulo = obra.Titulo,
            iswc = obra.Iswc,
        });

        await _obraRepo.SaveChangesAsync(ct);
        return MapToResponse(obra);
    }
}
```

### Mapeamento Handlers → Eventos

| Handler | Evento | Payload |
|---------|--------|---------|
| LiberarObraCommandHandler (F07) | `cadastro.obra.liberada` | obraId, titulo, iswc |
| BloquearObraCommandHandler (F07) | `cadastro.obra.bloqueada` | obraId, titulo, justificativa |
| AlterarDominioPublicoCommandHandler (F03) | `cadastro.obra.dominio-publico` | obraId, titulo, dominioPublico |
| DepurarObraCommandHandler (F03) | `cadastro.obra.depurada` | obraId, titulo, iswcOriginal, novaObraId |
| LiberarFonogramaCommandHandler (F07) | `cadastro.fonograma.liberado` | fonogramaId, isrc, obraId |
| DepurarFonogramaCommandHandler (F05) | `cadastro.fonograma.depurado` | fonogramaId, isrcOriginal, novoFonogramaId, obraId |
| BloquearFonogramaCommandHandler (F07) | `cadastro.fonograma.bloqueado` | fonogramaId, isrc, justificativa |
| CriarTitularCommandHandler (F02) | `cadastro.titular.criado` | titularId, nome, tipo, documento |

### Schema PostgreSQL

```sql
CREATE TABLE cadastro.outbox_events (
    "Id"          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "Type"        VARCHAR(100)  NOT NULL,
    "RoutingKey"  VARCHAR(100)  NOT NULL,
    "Subject"     VARCHAR(50)   NOT NULL,
    "Payload"     JSONB         NOT NULL,
    "CreatedAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "PublishedAt" TIMESTAMPTZ   NULL,
    "Attempts"    INTEGER       NOT NULL DEFAULT 0
);

CREATE INDEX ix_outbox_pendentes ON cadastro.outbox_events ("PublishedAt", "Attempts")
    WHERE "PublishedAt" IS NULL AND "Attempts" < 10;
```

### Configuração (.env)

```env
# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
OUTBOX_POLL_INTERVAL_SECONDS=5
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Domain** | | |
| `3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs` | Entidade | Id, Type, RoutingKey, Subject, Payload, CreatedAt, PublishedAt, Attempts |
| `3-Domain/Cadastro.Domain/Interfaces/IOutboxEventWriter.cs` | Interface | AddEvent(type, subject, data) |
| **Infra — Events** | | |
| `4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs` | Service | Implementação: serializa payload e salva no DbContext |
| `4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs` | BackgroundService | Lê outbox, publica no RabbitMQ, marca publicado |
| `4-Infra/Cadastro.Infra/Events/IRabbitMqPublisher.cs` | Interface | PublishAsync(routingKey, cloudEvent) |
| `4-Infra/Cadastro.Infra/Events/RabbitMqPublisher.cs` | Service | Conexão RabbitMQ, exchange declare, publish com CloudEvents |
| `4-Infra/Cadastro.Infra/Events/EventTypes.cs` | Constants | 8 constantes: `CadastroObraLiberada = "cadastro.obra.liberada"` etc. |
| **Infra — EF Core** | | |
| `4-Infra/Cadastro.Infra/Data/Configurations/OutboxEventConfiguration.cs` | Config EF | Fluent API, JSONB para Payload, índice parcial |
| `4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddOutboxEvents.cs` | Migration | Tabela outbox_events + índice |
| **Testes** | | |
| `5-Tests/Cadastro.UnitTests/Events/OutboxEventWriterTests.cs` | Teste | Verifica que AddEvent cria OutboxEvent no DbContext |
| `5-Tests/Cadastro.UnitTests/Events/OutboxEventTests.cs` | Teste | Entidade: Criar, MarcarPublicado, IncrementarTentativa, ExcedeuTentativas |
| `5-Tests/Cadastro.UnitTests/Events/OutboxPublisherWorkerTests.cs` | Teste | Mock RabbitMqPublisher, verifica ciclo publicação |
| `5-Tests/Cadastro.IntegrationTests/OutboxIntegrationTests.cs` | Teste | Handler → SaveChanges → outbox contém evento |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` | +DbSet<OutboxEvent>, ApplyConfiguration |
| `1-Services/Cadastro.API/Program.cs` | Registrar IOutboxEventWriter, IRabbitMqPublisher, AddHostedService<OutboxPublisherWorker>, ler RABBITMQ_URL e OUTBOX_POLL_INTERVAL do env |
| `services/cadastro-api/.env.example` | +RABBITMQ_URL, +OUTBOX_POLL_INTERVAL_SECONDS |
| **8 Handlers existentes:** | |
| `2-Application/.../Status/Commands/LiberarObraCommandHandler.cs` | +IOutboxEventWriter, +AddEvent("cadastro.obra.liberada") |
| `2-Application/.../Status/Commands/BloquearObraCommandHandler.cs` | +AddEvent("cadastro.obra.bloqueada") |
| `2-Application/.../Obras/Commands/AlterarDominioPublicoCommandHandler.cs` | +AddEvent("cadastro.obra.dominio-publico") |
| `2-Application/.../Obras/Commands/DepurarObraCommandHandler.cs` | +AddEvent("cadastro.obra.depurada") |
| `2-Application/.../Status/Commands/LiberarFonogramaCommandHandler.cs` | +AddEvent("cadastro.fonograma.liberado") |
| `2-Application/.../Fonogramas/Commands/DepurarFonogramaCommandHandler.cs` | +AddEvent("cadastro.fonograma.depurado") |
| `2-Application/.../Status/Commands/BloquearFonogramaCommandHandler.cs` | +AddEvent("cadastro.fonograma.bloqueado") |
| `2-Application/.../Titulares/Commands/CriarTitularCommandHandler.cs` | +AddEvent("cadastro.titular.criado") |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `tasks/prd-eventos-cadastro/prd.md` | 8 eventos com payloads definidos |
| CloudEvents spec (https://cloudevents.io/) | Formato dos eventos |

---

## Análise de Impacto

| Componente | Tipo | Descrição |
|---|---|---|
| 8 handlers existentes | Extensão | +IOutboxEventWriter injetado, +1 linha AddEvent antes do SaveChanges |
| Program.cs | Extensão | +3 registros DI + AddHostedService |
| .env | Extensão | +2 variáveis (RABBITMQ_URL, OUTBOX_POLL_INTERVAL) |
| CadastroDbContext | Extensão | +DbSet<OutboxEvent> |
| D02 Identificação (futuro) | Consumer | Consumirá `cadastro.fonograma.liberado` |
| D04 Distribuição (futuro) | Consumer | Consumirá `cadastro.obra.liberada`, `cadastro.obra.depurada` |
| Analytics (futuro) | Consumer | Consumirá todos os 8 eventos |

---

## Abordagem de Testes

### Unitários

| Classe | Cenários |
|--------|----------|
| OutboxEventTests | Criar (campos corretos), MarcarPublicado (PublishedAt preenchido), IncrementarTentativa (Attempts++), ExcedeuTentativas (true se >=10) |
| OutboxEventWriterTests | AddEvent cria OutboxEvent no context.OutboxEvents (mock DbContext) |
| OutboxPublisherWorkerTests | Mock IRabbitMqPublisher: ciclo com 3 eventos pendentes → 3 chamadas Publish, MarcarPublicado em cada. Ciclo com falha → IncrementarTentativa. Evento com 10 tentativas → ignorado. |

### Integração

| Cenário | Descrição |
|---------|-----------|
| Liberar obra → outbox | POST /obras/{id}/liberar → SELECT outbox WHERE type='cadastro.obra.liberada' → 1 registro |
| Criar titular → outbox | POST /titulares → SELECT outbox WHERE type='cadastro.titular.criado' → 1 registro |
| Outbox transacional | Criar titular com CPF inválido (rollback) → outbox vazia (nenhum evento) |
| Worker publica | Inserir evento manual na outbox → aguardar ciclo worker → PublishedAt preenchido |

---

## Sequenciamento de Desenvolvimento

1. **Domain** — OutboxEvent entidade, IOutboxEventWriter interface, EventTypes constantes
2. **Infra** — OutboxEventConfiguration, Migration (tabela outbox_events)
3. **Infra** — OutboxEventWriter (implementação)
4. **Infra** — IRabbitMqPublisher, RabbitMqPublisher (conexão + publish CloudEvents)
5. **Infra** — OutboxPublisherWorker (BackgroundService)
6. **Application** — Integrar IOutboxEventWriter nos 8 handlers existentes
7. **API** — Program.cs (DI + AddHostedService + env vars)
8. **Testes unitários** — OutboxEvent + Writer + Worker
9. **Testes integração** — Handler → outbox + transacionalidade

---

## Pacotes NuGet Necessários

| Pacote | Projeto | Propósito |
|--------|---------|-----------|
| `RabbitMQ.Client` | Infra | Conexão e publicação no RabbitMQ |
| `CloudNative.CloudEvents` | Infra | Serialização CloudEvents 1.0 |
| `CloudNative.CloudEvents.SystemTextJson` | Infra | Formatter JSON para CloudEvents |

---

## Mapeamento PRD → Implementação

| Requisito | Camada | Implementação |
|-----------|--------|---------------|
| RF-01 a RF-08 (8 eventos) | Application | AddEvent() nos 8 handlers |
| RF-09 a RF-12 (CloudEvents) | Infra | BuildCloudEvent no Worker + CloudNative lib |
| RF-13 a RF-15 (exchange topic) | Infra | RabbitMqPublisher.ExchangeDeclare + publish |
| RF-16 a RF-22 (Outbox Pattern) | Domain + Infra | OutboxEvent + OutboxEventWriter + OutboxPublisherWorker |
| RF-23 a RF-25 (idempotência) | Domain + Infra | UUID no OutboxEvent.Id + MessageId no RabbitMQ |

---

*Tech Spec gerada. Para gerar tasks, use `flow-task-creator`.*
