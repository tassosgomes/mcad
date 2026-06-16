---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>identificacao/infra/events + domain/entities</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<risk>high</risk>
<flow_mode>strict</flow_mode>
<model_tier>strong</model_tier>
<validation_level>full</validation_level>
<context_budget>large</context_budget>
<dependencies>database, rabbitmq</dependencies>
<unblocks>"4.0, 5.0"</unblocks>
</task_context>

# Tarefa 3.0: Identificação — Projeção local + Consumer RabbitMQ idempotente

## Visão Geral

Cria a tabela de read model `usuario_musica_snapshot` (schema `identificacao`) e o consumer BackgroundService que consome `arrecadacao.usuario-musica.criado/atualizado` e faz upsert idempotente na projeção. Clone arquitetural do `DistribuicaoEventConsumer` existente.

Cobre **RF-02** do PRD. Núcleo da arquitetura event-driven — o consumer garante isolamento entre os domínios.

## Requisitos

- Tabela `usuario_musica_snapshot` (Id UUID PK, RazaoSocial, Cnpj, Status, AtualizadoEm).
- Consumer conecta à exchange `arrecadacao.events`, fila durável `identificacao.usuario-musica.sync`, binds para `criado` e `atualizado`.
- Upsert idempotente por PK (Id); **guard de `AtualizadoEm`**: só aplica se incoming >= stored (proteção contra reordenação).
- Parse CloudEvent idêntico ao `DistribuicaoEventConsumer`.
- `autoAck: false`, ack manual; nack+requeue em exceção; reconnect com backoff.

## Subtarefas

- [ ] 3.1 Criar entidade `UsuarioMusicaSnapshot` (3-Domain/Entities)
- [ ] 3.2 Criar `IUsuarioMusicaSnapshotRepository` (3-Domain/Interfaces): `UpsertAsync`, `GetByAtualizadoEmGuardAsync`
- [ ] 3.3 Criar `UsuarioMusicaSnapshotRepository` (4-Infra/Repositories, EF Core, `AsNoTracking` em leituras)
- [ ] 3.4 Criar `UsuarioMusicaSnapshotConfiguration` (4-Infra/Data/Configurations) — tabela + índice em RazaoSocial
- [ ] 3.5 Adicionar `DbSet<UsuarioMusicaSnapshot>` no `IdentificacaoDbContext`
- [ ] 3.6 Criar `ArrecadacaoUsuarioMusicaEventConsumer` (4-Infra/Events, BackgroundService)
- [ ] 3.7 Registrar consumer + config `ARRECADACAO_EXCHANGE` no `Program.cs`
- [ ] 3.8 Criar EF migration (snapshot table — parte da captação vem na task 5.0; se preferir, unificar migrations aqui)
- [ ] 3.9 Testes unitários: consumer upsert cria/atualiza, idempotência (evento repetido), guard atualizadoEm (evento antigo não sobrescreve)
- [ ] 3.10 Teste de integração consumer→projeção (RabbitMQ em memória/Testcontainers)

## Sequenciamento

- Bloqueado por: 1.0 (eventos devem existir para consumir)
- Desbloqueia: 4.0 (endpoint de busca precisa da projeção), 5.0 (mesmo DbContext/migration)
- Paralelizável: Não (núcleo serial)

## Detalhes de Implementação

**Skills de referência:** `dotnet-architecture` (Repository + EF, CQRS), `dotnet-testing` (xUnit + AwesomeAssertions + Moq).

**Molde exato do consumer:** `DistribuicaoEventConsumer.cs` — copiar estrutura: consts (Exchange/Queue/RoutingKey), `ExecuteAsync` com loop+reconnect, `EnsureConnectedAsync` (ExchangeDeclare topic + QueueDeclare + QueueBind), `OnMessageAsync` (parse CloudEvent via `JsonEventFormatter`, processar, ack/nack), `CloseChannelAsync`.

**Diferenças vs DistribuicaoEventConsumer:**
- Exchange default: `arrecadacao.events`; config key: `ARRECADACAO_EXCHANGE`.
- **Dois** `QueueBindAsync` (uma por routing key: `criado` e `atualizado`).
- Records de payload: `UsuarioMusicaEventEnvelope` + `UsuarioMusicaEventData(Guid Id, string RazaoSocial, string Cnpj, string Status, DateTime AtualizadoEm)`.
- Upsert via `IUsuarioMusicaSnapshotRepository`.

**Guard de ordem (idempotência forte):**
```csharp
var existing = await repo.GetByIdAsync(data.Id, ct);
if (existing is not null && data.AtualizadoEm <= existing.AtualizadoEm)
{
    _logger.LogInformation("Evento {RoutingKey} para {Id} ignorado: stale (incoming {In} <= stored {St}).",
        ea.RoutingKey, data.Id, data.AtualizadoEm, existing.AtualizadoEm);
    await _channel.BasicAckAsync(ea.DeliveryTag, false);
    return;
}
```

**Entidade (3-Domain):**
```csharp
public class UsuarioMusicaSnapshot
{
    public Guid Id { get; private set; }
    public string RazaoSocial { get; private set; } = string.Empty;
    public string Cnpj { get; private set; } = string.Empty;
    public string Status { get; private set; } = string.Empty;
    public DateTime AtualizadoEm { get; private set; }
    private UsuarioMusicaSnapshot() { } // EF
    public static UsuarioMusicaSnapshot Criar(Guid id, string razao, string cnpj, string status, DateTime atualizadoEm) => ...;
}
```

**Config:** adicionar `ARRECADACAO_EXCHANGE` ao appsettings/default (`arrecadacao.events`).

## Contexto para Agentes

### Leitura Obrigatória

- TechSpec: §Componente — Consumer, §Modelo de Dados — Projeção
- Código existente: `DistribuicaoEventConsumer.cs` (molde completo), `IdentityUserEventConsumer.cs` (segundo exemplo)
- Código existente: `IdentificacaoDbContext.cs`, `CaptacaoConfiguration.cs` (molde de IEntityTypeConfiguration)
- `dotnet-architecture`: namespaces sem prefixo numérico, Repository+EF, `AsNoTracking` em leitura

### Pontos Críticos

- O consumer é `BackgroundService` registrado via `AddHostedService<>` no `Program.cs` — cria `IServiceScope` por mensagem (o repo é Scoped).
- Idempotência: chave natural = `Id` (PK). Reentregas (at-least-once) não duplicam.
- Guard de `AtualizadoEm` é essencial — sem ele, um evento atrasado sobrescreve dado mais novo.
- Schema `identificacao` (não cross-schema) — `modelBuilder.HasDefaultSchema("identificacao")` já configurado.

### Fora de Escopo

- Endpoint de busca (task 4.0).
- Mudança da Captação (task 5.0).
- Backfill (task 2.0, lado Arrecadação).

## Criterios de Sucesso

- `dotnet build` verde em todos os projetos da Identificação.
- `dotnet test --filter "FullyQualifiedName~ArrecadacaoUsuarioMusicaEventConsumer"` verde (upsert, idempotência, guard stale).
- `dotnet test --filter "FullyQualifiedName~UsuarioMusicaSnapshotRepository"` verde.
- Consumer loga Info em cada upsert e em evento stale ignorado.
- Tabela `identificacao.usuario_musica_snapshot` criada pela migration.
