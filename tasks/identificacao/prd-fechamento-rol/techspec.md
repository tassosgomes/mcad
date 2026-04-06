# Especificação Técnica Backend — F05: Fechamento do Rol

> **PRD:** `tasks/prd-fechamento-rol/prd.md`
> **API Contract:** `tasks/prd-fechamento-rol/api-contract.yaml`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-04

---

## Resumo Executivo

Esta feature adiciona ao serviço de Identificação: validação de pré-requisitos de fechamento (condicionais por rubrica), ação de fechamento irreversível com transição de estado, e publicação do evento `identificacao.rol.fechado` via Outbox Pattern. O Outbox Pattern (tabela + worker + RabbitMQ) é introduzido pela primeira vez no serviço de Identificação, seguindo o mesmo padrão do Cadastro (F08).

O payload do evento é diferenciado: rubricas audiovisuais levam tempo (início/fim/duração) + classificação (tipo/peso), rubricas de áudio levam somente quantidade.

---

## Arquitetura do Sistema

```
┌──────────────┐     ┌───────────────────────────────┐
│   Frontend    │────▶│  Identificação API :5100       │
│              │     │                               │
│  GET pre-req │     │  GET /captacoes/{id}/pre-req   │
│  POST fechar │     │  POST /captacoes/{id}/fechar   │
│              │     │                               │
│              │     │  ┌─────────────────────────┐  │
│              │     │  │ OutboxPublisherWorker    │──┼──▶ RabbitMQ
│              │     │  │ (Background Service)     │  │    routing: identificacao.rol.fechado
│              │     │  └─────────────────────────┘  │
└──────────────┘     └──────────┬────────────────────┘
                                │                    │
                    ┌───────────▼─────┐  ┌──────────▼──────┐
                    │  PostgreSQL 16   │  │  Cadastro :5001  │
                    │  schema: ident.  │  │  GET /obras/{id} │
                    │  + outbox_events │  └─────────────────┘
                    └─────────────────┘
```

**Componentes novos:**
- **OutboxEvent** — entidade + tabela (mesmo padrão do Cadastro)
- **OutboxPublisherWorker** — background service para RabbitMQ
- **RabbitMqPublisher** — client para publicação
- **FecharRolCommandHandler** — validação + transição + outbox
- **ValidarPreRequisitosQueryHandler** — checklist

---

## Design de Implementação

### Entidade: OutboxEvent (copiar padrão do Cadastro)

```csharp
public class OutboxEvent
{
    public Guid Id { get; private set; }
    public string Type { get; private set; }
    public string RoutingKey { get; private set; }
    public string Subject { get; private set; }
    public string Payload { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public int Attempts { get; private set; }

    private OutboxEvent() { }

    public static OutboxEvent Criar(string type, string subject, string payload) => new()
    {
        Id = Guid.NewGuid(),
        Type = type,
        RoutingKey = type,
        Subject = subject,
        Payload = payload,
        CreatedAt = DateTime.UtcNow,
        Attempts = 0,
    };

    public void MarcarPublicado() => PublishedAt = DateTime.UtcNow;
    public void IncrementarTentativa() => Attempts++;
    public bool ExcedeuTentativas => Attempts >= 10;
}
```

### Método `Captacao.Fechar()` — Adição ao domínio

```csharp
// Adicionar à entidade Captacao:
public void Fechar()
{
    ValidarAberta();
    Status = StatusCaptacao.Fechada;
    AtualizadoEm = DateTime.UtcNow;
}
```

### Payload do Evento

```csharp
public record RolFechadoPayload(
    Guid CaptacaoId,
    string Rubrica,
    string Periodo,
    DateTime FechadoEm,
    Guid AnalistaId,
    List<ExecucaoRolPayload> Execucoes);

public record ExecucaoRolPayload(
    Guid ObraId,
    Guid? FonogramaId,
    int Quantidade,
    string? TipoUtilizacao,   // Sigla: TA/TE/PE/BK — null para não-audiovisual
    decimal? Peso,             // 1.0 ou 0.0833 — null para não-audiovisual
    string? Inicio,           // HH:mm:ss — null para não-audiovisual
    string? Fim,              // HH:mm:ss — null para não-audiovisual
    int? DuracaoSegundos);    // null para não-audiovisual
```

### ValidarPreRequisitosQueryHandler

```csharp
public async Task<PreRequisitosResponse> HandleAsync(ValidarPreRequisitosQuery query, CancellationToken ct)
{
    var captacao = await _captacaoRepo.GetByIdAsync(query.CaptacaoId, ct)
        ?? throw new NotFoundException("Captação não encontrada.", query.CaptacaoId);

    var itens = new List<PreRequisitoItem>();
    var totalExecucoes = await _execucaoRepo.ContarPorCaptacaoAsync(query.CaptacaoId, ct);
    var pendentes = await _execucaoRepo.ContarPendentesAsync(query.CaptacaoId, ct);

    // 1. Mínimo 1 execução
    itens.Add(new("min_execucoes", "Ao menos 1 execução registrada",
        totalExecucoes >= 1, totalExecucoes == 0 ? "Nenhuma execução registrada" : null));

    // 2. Zero pendentes
    itens.Add(new("zero_pendentes", "Nenhuma execução pendente de identificação",
        pendentes == 0, pendentes > 0 ? $"{pendentes} execuções pendentes de identificação" : null));

    // 3. Obras/fonogramas LIBERADAS (consulta Cadastro)
    var obrasNaoLiberadas = await VerificarObrasLiberadasAsync(query.CaptacaoId, ct);
    itens.Add(new("obras_liberadas", "Todas as obras/fonogramas liberadas no Cadastro",
        obrasNaoLiberadas == 0, obrasNaoLiberadas > 0 ? $"{obrasNaoLiberadas} execuções referenciam obras/fonogramas não liberadas" : null));

    // 4-5. Condicionais para audiovisual
    if (captacao.Rubrica.ExigeClassificacao)
    {
        var semClassificacao = await _execucaoRepo.ContarSemTipoUtilizacaoAsync(query.CaptacaoId, ct);
        itens.Add(new("classificacao", "Todas as execuções com tipo de utilização",
            semClassificacao == 0, semClassificacao > 0 ? $"{semClassificacao} execuções sem tipo de utilização" : null));

        var semHorario = await _execucaoRepo.ContarSemHorarioAsync(query.CaptacaoId, ct);
        itens.Add(new("horarios", "Todas as execuções com início e fim",
            semHorario == 0, semHorario > 0 ? $"{semHorario} execuções sem horário de início/fim" : null));
    }

    return new PreRequisitosResponse(
        query.CaptacaoId,
        itens.All(i => i.Atendido),
        itens,
        new ResumoFechamento(totalExecucoes, totalExecucoes - pendentes, pendentes,
            captacao.Rubrica.Nome, captacao.Periodo, captacao.Rubrica.ExigeClassificacao));
}
```

### FecharRolCommandHandler

```csharp
public async Task<FechamentoResponse> HandleAsync(FecharRolCommand cmd, CancellationToken ct)
{
    var captacao = await _captacaoRepo.GetByIdAsync(cmd.CaptacaoId, ct)
        ?? throw new NotFoundException("Captação não encontrada.", cmd.CaptacaoId);

    captacao.ValidarAberta();
    captacao.ValidarPropriedade(cmd.AnalistaId);

    // Re-validar TODOS os pré-requisitos server-side
    var preRequisitos = await _preRequisitosHandler.HandleAsync(
        new ValidarPreRequisitosQuery(cmd.CaptacaoId), ct);

    if (!preRequisitos.TodosAtendidos)
    {
        var primeiroFalho = preRequisitos.Itens.First(i => !i.Atendido);
        throw new PreRequisitosException(primeiroFalho.Detalhe ?? "Pré-requisitos não atendidos",
            CodeFromPreRequisito(primeiroFalho.Id), preRequisitos.Itens);
    }

    // Fechar
    captacao.Fechar();

    // Montar payload do evento
    var execucoes = await _execucaoRepo.ListarTodasDaCaptacaoAsync(cmd.CaptacaoId, ct);
    var payload = MontarPayload(captacao, execucoes);

    // Outbox — mesma transação
    var payloadJson = JsonSerializer.Serialize(payload);
    _outboxWriter.AddEvent("identificacao.rol.fechado", cmd.CaptacaoId.ToString(), payloadJson);

    await _captacaoRepo.SaveChangesAsync(ct); // Atômica: update + outbox insert

    return new FechamentoResponse(cmd.CaptacaoId, "FECHADA", DateTime.UtcNow,
        execucoes.Count(), true);
}

private RolFechadoPayload MontarPayload(Captacao captacao, IEnumerable<Execucao> execucoes)
{
    var exePayloads = execucoes.Select(e => new ExecucaoRolPayload(
        e.ObraId, e.FonogramaId, e.Quantidade,
        captacao.Rubrica.ExigeClassificacao ? e.TipoUtilizacao?.Sigla : null,
        captacao.Rubrica.ExigeClassificacao ? e.TipoUtilizacao?.Peso : null,
        captacao.Rubrica.ExigeClassificacao ? e.Inicio.ToString("HH:mm:ss") : null,
        captacao.Rubrica.ExigeClassificacao ? e.Fim.ToString("HH:mm:ss") : null,
        captacao.Rubrica.ExigeClassificacao ? e.DuracaoSegundos : null
    )).ToList();

    return new RolFechadoPayload(
        captacao.Id, captacao.Rubrica.Sigla, captacao.Periodo.ToString("yyyy-MM-dd"),
        DateTime.UtcNow, captacao.AnalistaResponsavelId, exePayloads);
}
```

### Novos métodos no IExecucaoRepository

```csharp
// Adicionar ao IExecucaoRepository:
Task<int> ContarSemTipoUtilizacaoAsync(Guid captacaoId, CancellationToken ct);
Task<int> ContarSemHorarioAsync(Guid captacaoId, CancellationToken ct);
Task<IEnumerable<Execucao>> ListarTodasDaCaptacaoAsync(Guid captacaoId, CancellationToken ct);
```

### Outbox — Copiar padrão do Cadastro

Copiar do Cadastro para o serviço de Identificação:
- `OutboxEvent.cs` (entidade)
- `OutboxEventConfiguration.cs` (Fluent API)
- `IOutboxEventWriter.cs` + `OutboxEventWriter.cs` (adiciona evento ao DbContext)
- `IRabbitMqPublisher.cs` + `RabbitMqPublisher.cs` (publica no RabbitMQ)
- `OutboxPublisherWorker.cs` (background service que poll + publica)
- Migration para tabela `outbox_events` no schema `identificacao`

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/OutboxEvent.cs` | Entity | Copiar padrão Cadastro |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IOutboxEventWriter.cs` | Interface | AddEvent |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IRabbitMqPublisher.cs` | Interface | Publish |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/OutboxEventConfiguration.cs` | Config | Fluent API com índice parcial |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Events/OutboxEventWriter.cs` | Service | Adiciona ao DbContext |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Events/RabbitMqPublisher.cs` | Service | Publica no RabbitMQ |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Events/OutboxPublisherWorker.cs` | Worker | Poll + publish |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Events/EventTypes.cs` | Constants | `identificacao.rol.fechado`, `identificacao.rol.cancelado` |
| `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Queries/ValidarPreRequisitosQuery.cs` | Query | Checklist |
| `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Queries/ValidarPreRequisitosQueryHandler.cs` | Handler | Valida 5 pré-requisitos |
| `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Commands/FecharRolCommand.cs` | Command | + Validator |
| `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Commands/FecharRolCommandHandler.cs` | Handler | Re-valida + fecha + outbox |
| `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Responses/PreRequisitosResponse.cs` | DTO | Checklist + resumo |
| `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Responses/FechamentoResponse.cs` | DTO | Resultado do fechamento |
| `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Payloads/RolFechadoPayload.cs` | DTO | Payload do evento CloudEvents |
| `services/identificacao-api/1-Services/Identificacao.API/Endpoints/FechamentoEndpoints.cs` | Endpoint | GET pre-req + POST fechar |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ValidarPreRequisitosQueryHandlerTests.cs` | Teste | Cenários de checklist |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/FecharRolCommandHandlerTests.cs` | Teste | Fechamento + outbox |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` | Adicionar método `Fechar()` |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IExecucaoRepository.cs` | Adicionar ContarSemTipoUtilizacao, ContarSemHorario, ListarTodas |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ExecucaoRepository.cs` | Implementar novos métodos |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs` | Adicionar DbSet OutboxEvent |
| `services/identificacao-api/1-Services/Identificacao.API/Program.cs` | Registrar Outbox (writer, publisher, worker), RabbitMQ, mapear endpoints |
| `services/identificacao-api/.env.example` | Adicionar vars RabbitMQ |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `services/cadastro-api/4-Infra/Cadastro.Infra/Events/` | Padrão completo de Outbox (copiar) |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs` | Entidade de referência |
| `services/cadastro-api/1-Services/Cadastro.API/Program.cs` | Registro do RabbitMQ |

---

## Abordagem de Testes

### ValidarPreRequisitosQueryHandlerTests

| Cenário | Tipo |
|---------|------|
| Todos atendidos → todosAtendidos=true | Unit |
| Zero execuções → min_execucoes falha | Unit |
| 3 pendentes → zero_pendentes falha | Unit |
| Audiovisual sem tipo utilização → classificacao falha | Unit |
| Audiovisual sem horário → horarios falha | Unit |
| Não-audiovisual → itens 4-5 não aparecem | Unit |
| Obra PENDENTE no Cadastro → obras_liberadas falha | Unit |

### FecharRolCommandHandlerTests

| Cenário | Tipo |
|---------|------|
| Fechar com todos pré-req OK → FECHADA + outbox event | Unit |
| Fechar com pendentes → rejeita | Unit |
| Fechar por outro analista → ForbiddenException | Unit |
| Captação já FECHADA → rejeita | Unit |
| Payload audiovisual inclui tempo+peso | Unit |
| Payload não-audiovisual tem campos null | Unit |

---

## Sequenciamento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Domain — `Captacao.Fechar()`, OutboxEvent, interfaces | Nenhuma |
| 2 | Infra — OutboxEvent config + migration, novos métodos ExecucaoRepo | Etapa 1 |
| 3 | Infra — OutboxEventWriter, RabbitMqPublisher, OutboxPublisherWorker | Etapa 2 |
| 4 | Application — ValidarPreRequisitosQueryHandler | Etapa 2 |
| 5 | Application — FecharRolCommandHandler + Payloads | Etapa 3 + 4 |
| 6 | API — FechamentoEndpoints + Program.cs (RabbitMQ, outbox) | Etapa 5 |
| 7 | Testes | Etapa 4 + 5 |

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

Telas:
1. Botão "Fechar Rol" na CaptacaoDetailPage (visível para ABERTA + dono)
2. Modal de fechamento com checklist ✅/❌ + resumo + botão confirmar (desabilitado se não atende)
3. Estado pós-fechamento (status FECHADA, botões de edição ocultos)

---

*TechSpec gerada com a skill `flow-techspec-creator`.*
