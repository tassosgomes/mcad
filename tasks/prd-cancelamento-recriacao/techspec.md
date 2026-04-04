# Especificação Técnica Backend — F06: Cancelamento e Recriação

> **PRD:** `tasks/prd-cancelamento-recriacao/prd.md`
> **API Contract:** `tasks/prd-cancelamento-recriacao/api-contract.yaml`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-04

---

## Resumo Executivo

Esta feature adiciona ao serviço de Identificação: cancelamento de Rols fechados com justificativa, publicação do evento `identificacao.rol.cancelado` via Outbox (já implementado em F05), 3 opções de recriação (copiar execuções, vazia, apenas cancelar), bloqueio pós-distribuição via consumer de `distribuicao.rol.processado`, e novos campos na entidade Captação.

A principal novidade arquitetural é o **primeiro consumer de RabbitMQ** no serviço de Identificação — até agora o serviço só produzia eventos.

---

## Arquitetura do Sistema

```
                    ┌───────────────────────────────────────┐
                    │  Identificação API :5100               │
                    │                                       │
  Frontend ────────▶│  GET /captacoes/{id}/pode-cancelar    │
                    │  POST /captacoes/{id}/cancelar        │
                    │                                       │
  RabbitMQ ────────▶│  ┌─────────────────────────────────┐ │
  distribuicao.     │  │DistribuicaoEventConsumer         │ │
  rol.processado    │  │(Hosted Service — consume events) │ │
                    │  └─────────────────────────────────┘ │
                    │                                       │
                    │  ┌─────────────────────────────────┐ │──▶ RabbitMQ
                    │  │ OutboxPublisherWorker (F05)       │ │   identificacao.rol.cancelado
                    │  └─────────────────────────────────┘ │
                    └──────────┬────────────────────────────┘
                               │
                   ┌───────────▼───────────┐
                   │  PostgreSQL 16         │
                   │  schema: identificacao │
                   └───────────────────────┘
```

**Componentes novos:**
- **DistribuicaoEventConsumer** — hosted service que consume eventos do RabbitMQ
- **CancelarRolCommandHandler** — cancela + outbox + recriação atômica
- Novos campos na entidade Captação

---

## Design de Implementação

### Novos campos na entidade Captação

```csharp
// Adicionar à entidade Captacao:
public bool DistribuicaoProcessada { get; private set; }
public DateTime? DistribuicaoProcessadaEm { get; private set; }
public string? JustificativaCancelamento { get; private set; }
public DateTime? CanceladoEm { get; private set; }

public void MarcarDistribuicaoProcessada(DateTime processadoEm)
{
    DistribuicaoProcessada = true;
    DistribuicaoProcessadaEm = processadoEm;
}

public void Cancelar(string justificativa)
{
    if (Status != StatusCaptacao.Fechada)
        throw new DomainException("Apenas captações FECHADAS podem ser canceladas.");
    if (DistribuicaoProcessada)
        throw new DomainException("Este Rol já foi processado pela Distribuição e não pode ser cancelado.");

    Status = StatusCaptacao.Cancelada;
    JustificativaCancelamento = justificativa;
    CanceladoEm = DateTime.UtcNow;
    AtualizadoEm = DateTime.UtcNow;
}
```

### CancelarRolCommandHandler

```csharp
public record CancelarRolCommand(
    Guid CaptacaoId, string Justificativa, string OpcaoRecriacao, Guid AnalistaId
) : ICommand<CancelamentoResponse>;

public async Task<CancelamentoResponse> HandleAsync(CancelarRolCommand cmd, CancellationToken ct)
{
    var captacao = await _captacaoRepo.GetByIdAsync(cmd.CaptacaoId, ct)
        ?? throw new NotFoundException("Captação não encontrada.", cmd.CaptacaoId);

    captacao.ValidarPropriedade(cmd.AnalistaId);
    captacao.Cancelar(cmd.Justificativa); // Valida FECHADA + não processada

    // Evento outbox
    var payload = new RolCanceladoPayload(
        captacao.Id, captacao.Rubrica.Sigla, captacao.Periodo.ToString("yyyy-MM-dd"),
        DateTime.UtcNow, cmd.AnalistaId, cmd.Justificativa);
    _outboxWriter.AddEvent("identificacao.rol.cancelado", cmd.CaptacaoId.ToString(),
        JsonSerializer.Serialize(payload));

    // Recriação
    Guid? novaCaptacaoId = null;
    int? execucoesCopiadas = null;

    if (cmd.OpcaoRecriacao is "COPIAR_EXECUCOES" or "RECRIAR_VAZIA")
    {
        var novaCaptacao = Captacao.Criar(
            captacao.RubricaId, captacao.Periodo, captacao.UsuarioDeMusica,
            cmd.AnalistaId, captacao.AnalistaResponsavelNome);
        await _captacaoRepo.AddAsync(novaCaptacao, ct);
        novaCaptacaoId = novaCaptacao.Id;

        if (cmd.OpcaoRecriacao == "COPIAR_EXECUCOES")
        {
            var execucoes = await _execucaoRepo.ListarTodasDaCaptacaoAsync(cmd.CaptacaoId, ct);
            int copiadas = 0;

            foreach (var batch in execucoes.Chunk(100))
            {
                foreach (var exec in batch)
                {
                    // Re-verificar status no Cadastro
                    var status = await ResolverStatusAsync(exec.ObraId, exec.FonogramaId, ct);

                    var copia = Execucao.Criar(
                        novaCaptacao.Id, exec.ObraId, exec.FonogramaId,
                        exec.ObraTitulo, exec.FonogramaIsrc, exec.ObraIswc,
                        exec.Interpretes, exec.Inicio, exec.Fim,
                        exec.Quantidade, exec.TipoUtilizacaoId, exec.TituloPrograma,
                        status);
                    await _execucaoRepo.AddAsync(copia, ct);
                    copiadas++;
                }
                await _execucaoRepo.SaveChangesAsync(ct);
            }
            execucoesCopiadas = copiadas;
        }
    }

    await _captacaoRepo.SaveChangesAsync(ct); // Atômica: cancel + outbox + nova captação

    return new CancelamentoResponse(
        cmd.CaptacaoId, "CANCELADA", cmd.Justificativa, DateTime.UtcNow,
        cmd.OpcaoRecriacao, novaCaptacaoId, execucoesCopiadas, true);
}
```

### PodeCancelarQueryHandler

```csharp
public async Task<PodeCancelarResponse> HandleAsync(PodeCancelarQuery query, CancellationToken ct)
{
    var captacao = await _captacaoRepo.GetByIdAsync(query.CaptacaoId, ct)
        ?? throw new NotFoundException("Captação não encontrada.", query.CaptacaoId);

    bool podeCancelar = captacao.Status == StatusCaptacao.Fechada && !captacao.DistribuicaoProcessada;
    string? motivo = null;

    if (captacao.Status != StatusCaptacao.Fechada)
        motivo = "Apenas captações FECHADAS podem ser canceladas";
    else if (captacao.DistribuicaoProcessada)
        motivo = "Este Rol já foi processado pela Distribuição";

    return new PodeCancelarResponse(
        query.CaptacaoId, podeCancelar, motivo,
        captacao.DistribuicaoProcessada, captacao.DistribuicaoProcessadaEm);
}
```

### DistribuicaoEventConsumer — Consumer RabbitMQ

```csharp
public class DistribuicaoEventConsumer : BackgroundService
{
    private IConnection _connection;
    private IModel _channel;

    protected override Task ExecuteAsync(CancellationToken ct)
    {
        var factory = new ConnectionFactory { HostName = _rabbitHost, Port = _rabbitPort };
        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();

        _channel.QueueDeclare("identificacao.distribuicao.rol.processado",
            durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind("identificacao.distribuicao.rol.processado",
            "distribuicao", "distribuicao.rol.processado");

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += async (_, ea) =>
        {
            try
            {
                var body = Encoding.UTF8.GetString(ea.Body.ToArray());
                var evento = JsonSerializer.Deserialize<DistribuicaoRolProcessadoEvent>(body);

                if (evento?.Data?.CaptacaoId != null)
                {
                    using var scope = _scopeFactory.CreateScope();
                    var captacaoRepo = scope.ServiceProvider.GetRequiredService<ICaptacaoRepository>();
                    var captacao = await captacaoRepo.GetByIdAsync(evento.Data.CaptacaoId, ct);

                    if (captacao != null)
                    {
                        captacao.MarcarDistribuicaoProcessada(evento.Data.ProcessadoEm);
                        await captacaoRepo.SaveChangesAsync(ct);
                        _logger.LogInformation("Captação {Id} marcada como processada pela Distribuição",
                            captacao.Id);
                    }
                }

                _channel.BasicAck(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao processar evento distribuicao.rol.processado");
                _channel.BasicNack(ea.DeliveryTag, false, true); // Requeue
            }
        };

        _channel.BasicConsume("identificacao.distribuicao.rol.processado", false, consumer);
        return Task.CompletedTask;
    }
}

public record DistribuicaoRolProcessadoEvent(
    string Type,
    DistribuicaoRolProcessadoData Data);

public record DistribuicaoRolProcessadoData(
    Guid CaptacaoId, DateTime ProcessadoEm);
```

### Migration (incremental)

```sql
ALTER TABLE identificacao."Captacoes"
    ADD COLUMN "DistribuicaoProcessada" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN "DistribuicaoProcessadaEm" TIMESTAMP WITH TIME ZONE,
    ADD COLUMN "JustificativaCancelamento" TEXT,
    ADD COLUMN "CanceladoEm" TIMESTAMP WITH TIME ZONE;
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Commands/CancelarRolCommand.cs` | Command | + Validator (justificativa min 10) |
| `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Commands/CancelarRolCommandHandler.cs` | Handler | Cancela + outbox + recriação |
| `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Queries/PodeCancelarQuery.cs` | Query | Verificação prévia |
| `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Queries/PodeCancelarQueryHandler.cs` | Handler | Checa status + flag distribuição |
| `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Responses/CancelamentoResponse.cs` | DTO | |
| `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Responses/PodeCancelarResponse.cs` | DTO | |
| `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Payloads/RolCanceladoPayload.cs` | DTO | Payload do evento |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Events/DistribuicaoEventConsumer.cs` | Consumer | Primeiro consumer RabbitMQ |
| `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CancelamentoEndpoints.cs` | Endpoint | GET pode-cancelar + POST cancelar |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CancelarRolCommandHandlerTests.cs` | Teste | Cancelamento + recriação |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Domain/CaptacaoCancelamentoTests.cs` | Teste | Cancelar(), MarcarDistribuicaoProcessada() |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` | Adicionar campos + métodos Cancelar(), MarcarDistribuicaoProcessada() |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/CaptacaoConfiguration.cs` | Mapear novos campos |
| `services/identificacao-api/1-Services/Identificacao.API/Program.cs` | Registrar DistribuicaoEventConsumer, mapear endpoints |
| `services/identificacao-api/.env.example` | Vars RabbitMQ (se não adicionadas em F05) |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `services/identificacao-api/4-Infra/Identificacao.Infra/Events/OutboxEventWriter.cs` | Reutilizar para evento de cancelamento (F05) |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Events/RabbitMqPublisher.cs` | Referência para consumer |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs` | Padrão de connection/channel RabbitMQ |

---

## Abordagem de Testes

### CaptacaoCancelamentoTests (domain)

| Cenário | Tipo |
|---------|------|
| Cancelar FECHADA + não processada → CANCELADA | Unit |
| Cancelar ABERTA → DomainException | Unit |
| Cancelar já processada → DomainException | Unit |
| MarcarDistribuicaoProcessada → flag true | Unit |

### CancelarRolCommandHandlerTests

| Cenário | Tipo |
|---------|------|
| Cancelar com opção APENAS_CANCELAR → cancela sem nova captação | Unit |
| Cancelar com opção RECRIAR_VAZIA → nova captação ABERTA sem execuções | Unit |
| Cancelar com opção COPIAR_EXECUCOES → nova captação com execuções copiadas | Unit |
| Cancelar por outro analista → ForbiddenException | Unit |
| Cancelar distribuição processada → DomainException | Unit |
| Justificativa vazia → ValidationException | Unit |
| Evento outbox criado na mesma transação | Unit |

---

## Sequenciamento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Domain — novos campos Captacao + métodos Cancelar/MarcarDistribuicao | Nenhuma |
| 2 | Infra — migration novos campos + CaptacaoConfiguration update | Etapa 1 |
| 3 | Infra — DistribuicaoEventConsumer | Etapa 2 |
| 4 | Application — PodeCancelarQuery + Handler | Etapa 2 |
| 5 | Application — CancelarRolCommand + Handler (com recriação) | Etapa 2 |
| 6 | API — CancelamentoEndpoints + Program.cs | Etapa 3 + 4 + 5 |
| 7 | Testes | Etapa 1 (domain) + 5 (handler) |

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

Telas:
1. Botão "Cancelar Rol" no header da CaptacaoDetailPage (danger, visível para FECHADA + dono + não processada)
2. Botão desabilitado com tooltip "Rol já processado pela Distribuição"
3. Modal de cancelamento: textarea justificativa + 3 radio buttons de recriação + botão danger
4. Banner na captação CANCELADA com justificativa e data
5. Estado pós-recriação: redirecionamento para nova captação

---

*TechSpec gerada com a skill `flow-techspec-creator`.*
