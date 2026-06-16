# Especificação Técnica — Lookup de Usuário de Música em Captações (Event-Driven ACL)

> **PRD de referência:** `tasks/identificacao/prd-lookup-usuario-musica-captacao/prd.md`
> **Domínios:** D03 Arrecadação (produtor + backfill), D02 Identificação (consumidor + lookup + captação)
> **Stack:** Java/Spring Boot 3.3 (produtor) · .NET 8 (consumidor) · React/Vite/TS (frontend)

---

## Resumo Executivo

A feature substitui o campo de texto livre "Usuário de Música" da Captação por um lookup contra uma **projeção local read-only** mantida na Identificação via **eventos de domínio** publicados pela Arrecadação. Não há nenhuma chamada HTTP síncrona cross-domain no fluxo de busca/criação — o isolamento entre os microsserviços é preservado.

A implementação reutiliza dois padrões já consagrados na codebase: (1) o **Outbox + CloudEvents** da Arrecadação (precedente: handlers de Rubrica), e (2) o **consumer BackgroundService** da Identificação (precedente: `DistribuicaoEventConsumer`). A única novidade arquitetural é a tabela de projeção `usuario_musica_snapshot`, que é um read model CQRS clássico. A Captação passa a armazenar `UsuarioMusicaId` (referência) + `UsuarioMusicaNome` (snapshot denormalizado).

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
┌──────────────────── D03 ARRECADACAO (Java) ────────────────────┐
│  UsuarioMusica command handlers (Criar/Atualizar/Ativar/Inativar)│
│        └─► OutboxEventWriter.addEvent("arrecadacao.usuario-     │
│              musica.criado|atualizado", payload COMPLETO)        │
│  OutboxPublisherWorker ──► RabbitMQ (exchange "arrecadacao.     │
│              events", routing key = type)                        │
│  UsuarioMusicaSnapshotRepublisher (backfill one-shot)            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ CloudEvent (fat payload)
                               ▼
┌──────────────────── D02 IDENTIFICACAO (.NET) ──────────────────┐
│  ArrecadacaoUsuarioMusicaEventConsumer (BackgroundService)       │
│        └─► upsert idempotente em usuario_musica_snapshot         │
│  BuscarUsuariosMusicaQuery/Handler ── consulta SÓ a projeção     │
│  GET /api/v1/usuarios-musica (local, status=ATIVO)               │
│  Captacao: UsuarioMusicaId (Guid) + UsuarioMusicaNome (snapshot) │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP local
                               ▼
┌──────────────────── FRONTEND (React) ──────────────────────────┐
│  CaptacaoForm + CaptacaoFilters: Autocomplete (debounce) →      │
│        apiGetIden("/usuarios-musica?q=...")                      │
└─────────────────────────────────────────────────────────────────┘
```

**Fluxo de dados principal (busca/seleção):** Frontend → endpoint local Identificação → projeção local. A Arrecadação não participa do caminho crítico.

**Fluxo de sincronização (assíncrono):** Comando Arrecadação → Outbox (mesma transação) → RabbitMQ → Consumer Identificação → upsert projeção.

## Design de Implementação

### Contrato de Evento (fat payload)

A Arrecadação publica o **snapshot completo** do `UsuarioMusica`. Cada consumidor projeta apenas seu recorte — princípio que evita retrabalho no produtor quando outros domínios passarem a consumir.

```json
{
  "id": "uuid",
  "razaoSocial": "Rádio Globo SP Ltda",
  "nomeFantasia": "Rádio Globo",
  "cnpj": "12345678000190",
  "cnpjFormatado": "12.345.678/0001-90",
  "status": "ATIVO",
  "criadoEm": "2026-06-16T12:00:00Z",
  "atualizadoEm": "2026-06-16T12:00:00Z"
}
```

> Endereço e contato **não** são incluídos no payload nesta versão (são irrelevantes para todos os consumidores conhecidos). Se um consumidor futuro precisar, o payload é estendido (campo aditivo, sem quebra). Decisão documentada para evitar over-engineering.

| Evento | Routing Key | Quando |
|---|---|---|
| `arrecadacao.usuario-musica.criado` | idem | Criação (`CriarUsuarioMusicaCommandHandler`) |
| `arrecadacao.usuario-musica.atualizado` | idem | Atualização, ativação e inativação |

O `routingKey` é igual ao `type` (já é assim em `OutboxEvent.criar`), publicado na exchange tópico `arrecadacao.events`.

### Componente — Produtor (Arrecadação)

**`UsuarioMusicaIntegrationEventMapper`** (novo, camada application): método estático `toPayload(UsuarioMusica)` → `Map<String,Object>`. Centraliza o schema do evento, evitando duplicação nos 4 handlers. Os 4 command handlers recebem `OutboxEventWriter` (já injetado nos handlers de Rubrica) e chamam:

```java
outboxEventWriter.addEvent(
    "arrecadacao.usuario-musica.criado",   // ou ".atualizado"
    saved.getId().toString(),
    UsuarioMusicaIntegrationEventMapper.toPayload(saved));
```

A publicação ocorre **após** `repository.save`, dentro do `@Transactional` existente — portanto na mesma transação (garantia do Outbox).

### Componente — Consumer (Identificação)

**`ArrecadacaoUsuarioMusicaEventConsumer : BackgroundService`** — clone arquitetural do `DistribuicaoEventConsumer`:
- Exchange: `arrecadacao.events` (config `ARRECADACAO_EXCHANGE`, default `arrecadacao.events`)
- Fila durável: `identificacao.usuario-musica.sync`
- Dois binds: routing keys `arrecadacao.usuario-musica.criado` e `arrecadacao.usuario-musica.atualizado`
- Parse CloudEvent idêntico ao existente (`JsonEventFormatter`)
- `autoAck: false`, ack manual; em exceção, `BasicNackAsync(requeue: true)`
- Reconnect com backoff (`RABBITMQ_RECONNECT_SECONDS`)

**Idempotência e proteção contra ordem invertida:** o upsert usa `Id` como PK. Para evitar que um evento antigo (reentrega/atraso) sobrescreva dado mais novo, o consumer compara `atualizadoEm` do evento com o `AtualizadoEm` armazenado — só aplica se o incoming for `>=`. Isso cobre at-least-once + reordenação.

### Modelo de Dados — Projeção (Identificação, schema `identificacao`)

```sql
CREATE TABLE "identificacao"."usuario_musica_snapshot" (
    "Id"           UUID          PRIMARY KEY,
    "RazaoSocial"  VARCHAR(200)  NOT NULL,
    "Cnpj"         VARCHAR(14)   NOT NULL,
    "Status"       VARCHAR(10)   NOT NULL,   -- ATIVO | INATIVO
    "AtualizadoEm" TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_usuarios_musica_snapshot_razao_social
    ON "identificacao"."usuario_musica_snapshot" ("RazaoSocial");
```

Entidade `UsuarioMusicaSnapshot` (domain) + `IUsuarioMusicaSnapshotRepository` + implementação EF + `UsuarioMusicaSnapshotConfiguration`. Registrada como `DbSet` no `IdentificacaoDbContext`.

### Modelo de Dados — Captação (mudança de schema)

`Captacao.UsuarioDeMusica` (string, varchar 200) → **removido**. Adicionados:
- `UsuarioMusicaId` (Guid, not null) — referência estável ao UsuarioMusica
- `UsuarioMusicaNome` (string, varchar 200, not null) — snapshot denormalizado para exibição resiliente

A migration **limpa** os dados fake existentes (TRUNCATE de captações ou DROP da coluna antiga sem backfill de negócio — módulo fora de produção, conforme decisão do PRD).

### Endpoints de API (Identificação)

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/v1/usuarios-musica?q={razaoSocial}&cnpj={cnpj}` | Busca projeção local, `status=ATIVO`, ILIKE razão social (min 2 chars), size 10. Permissão: leitura da Identificação. |
| `GET` | `/api/v1/captacoes?...&usuarioMusicaId={guid}` | Filtro adicional (RF-06) na lista existente. |

`CriarCaptacaoRequest`/`AtualizarCaptacaoRequest` mudam de `UsuarioDeMusica: string` para `UsuarioMusicaId: Guid` + `UsuarioMusicaNome: string`.

### Backfill (RF — open question resolvida)

**`POST /api/v1/usuarios-musica/manutencao/replicar-snapshot`** na Arrecadação, gated por permissão de manutenção. Handler `ReplicarUsuariosMusicaSnapshotCommandHandler` itera todos os `UsuarioMusica` e grava `arrecadacao.usuario-musica.atualizado` no Outbox para cada um. A Identificação consome normalmente e popula a projeção. Reutilizável para re-sincronizações futuras. Análogo ao `OutboxSeedService` de Rubricas.

## Pontos de Integração

- **RabbitMQ** (exchange `arrecadacao.events`, tópico): único ponto de acoplamento entre os domínios. Sem chamadas HTTP runtime.
- **CloudEvents 1.0** (formato JSON): ambos os lados já usam `CloudNative.CloudEvents`. Sem novo formato.
- **Sem dependência de token cross-domain**: o consumer lê eventos de integração (não autenticados por usuário); a busca na Identificação usa autorização local.

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação |
|---|---|---|---|
| `Captacao` (.NET) + migration | Mudança de schema (incompatível) | Coluna texto livre removida; 2 colunas novas. Dados fake descartados. Risco baixo (fora de produção). | Coordenar migration; atualizar todos os callers. |
| Eventos `identificacao.rol.fechado` / `.cancelado` | Mudança de contrato (compatível) | Payload ganha `usuarioMusicaId` + `usuarioMusicaNome` (campos aditivos opcionais). Distribuição (D04) não os consome hoje. | Adicionar como opcionais; notificar D04. |
| Handlers UsuarioMusica (Arrecadação) | Comportamental | Passam a gravar no Outbox. Testes existentes precisam mockar `OutboxEventWriter`. | Atualizar testes unitários e IT. |
| Distribuição (D04) | Indireto, baixo | Novos eventos `arrecadacao.usuario-musica.*` fluem no broker; D04 ignora (sem bind). | Nenhuma ação; documentar no catálogo de eventos. |
| Frontend Identificação | Mudança de contrato | `CaptacaoForm`/`CaptacaoFilters`/tipos trocam texto por ID+nome. | Atualizar tipos, API client, componentes. |

## Abordagem de Testes

### Unitários
- **Arrecadação:** cada handler verifica `verify(outboxEventWriter).addEvent(eq("arrecadacao.usuario-musica.criado\|atualizado"), anyString(), anyMap())` — espelha `CriarRubricaCommandHandlerTest`. `UsuarioMusicaIntegrationEventMapper` testa mapeamento de campos.
- **Identificação:** `ArrecadacaoUsuarioMusicaEventConsumer` — upsert cria/atualiza, idempotência (evento repetido não duplica), guarda de `atualizadoEm` (evento antigo não sobrescreve). `BuscarUsuariosMusicaQueryHandler` — filtra ATIVO, min 2 chars, pagina 10. `Captacao.Criar/Atualizar` com novos campos.
- **Frontend:** `CaptacaoForm` valida seleção obrigatória; hook de busca debounced.

### Integração
- **Arrecadação:** `UsuarioMusicaEventOutboxIT` (clone do `RubricaEventOutboxIT`) — operação de write gera evento no Outbox com tipo e payload corretos.
- **Identificação:** IT do consumer com RabbitMQ em memória/Testcontainers validando ponta-a-ponta evento→projeção; IT do endpoint de busca com projeção populada.
- **Frontend:** MSW mockando `/usuarios-musica` local.

## Sequenciamento de Desenvolvimento

1. **Arrecadação — produtor** (desbloqueia tudo): mapper de payload + outbox nos 4 handlers + endpoint de backfill + testes. Publicável independentemente.
2. **Identificação — projeção + consumer:** entidade/repo/config/migration + consumer + endpoint de busca + testes.
3. **Identificação — Captação:** mudança de schema (entidade, config, commands, handlers, responses, queries, audit mapper, evento rol) + migration.
4. **Frontend:** tipos + API client + hooks + Autocomplete no form e filtros + tabela/detalhe.
5. **Backfill one-shot** + validação E2E.

### Dependências Técnicas
- Passo 2 depende do passo 1 (eventos devem existir para consumir).
- Passo 3 depende do passo 2 (mesmo serviço).
- Passo 4 depende do passo 3 (contratos da API).

## Monitoramento e Observabilidade

- **Logs estruturados:** consumer loga Info em cada upsert (`usuarioMusicaId`, `status`) e Warning em eventos ignorados/invalidados; Warning em reconexão (já padrão).
- **Métricas:** contador de eventos consumidos/erros no consumer (futuro Micrometer/OTEL; fora do escopo Must).
- **Health:** o consumer já integra ao ciclo do host; indisponibilidade do RabbitMQ não derruba a API (degradação: projeção stale, busca funcional).

## Considerações Técnicas

### Decisões Principais
- **Event-driven ACL (não HTTP):** preserva isolamento/SLA; consistência eventual aceitável para lookup. Alternativa ACL HTTP rejeitada no PRD.
- **Fat payload sem endereço/contato:** recorte suficiente para todos os consumidores conhecidos; extensível aditivamente.
- **Guard de `atualizadoEm`:** proteção contra reordenação sem custo de versionamento complexo.
- **Snapshot denormalizado na Captação:** exibição resiliente mesmo com Arrecadação fora.
- **Dois eventos (criado/atualizado):** segue precedente das Rubricas; `atualizado` cobre status (payload carrega o novo status).

### Riscos Conhecidos
- **Janela de consistência eventual:** usuário recém-criado pode não aparecer por segundos na busca. Mitigação: documentar; aceitável para lookup não-crítico.
- **Projeção stale se broker cair por longo período:** sem job de reconciliação (Non-Goal). Mitigação: endpoint de backfill reutilizável.
- **Mudança de schema da Captação:** incompatível, mas dados são fake (risco mínimo).

### Conformidade com Padrões
- Segue Clean Architecture em camadas numeradas (.NET) e multi-módulo Maven (Java).
- Reutiliza Outbox Pattern, CloudEvents, BackgroundService consumer, EF migrations, FluentValidation.
- Sem cross-schema queries (projeção vive no schema `identificacao`).
- Naming: PascalCase (.NET), camelCase (Java/JSON), kebab-case (paths).

---

## Inventário de Artefatos

### Arrecadação — Java (Produtor + Backfill)

**A Criar:**
- `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/events/UsuarioMusicaIntegrationEventMapper.java` — mapper estático `UsuarioMusica → Map` (schema do fat payload).
- `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/ReplicarUsuariosMusicaSnapshotCommand.java` — comando de backfill.
- `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/commands/handlers/ReplicarUsuariosMusicaSnapshotCommandHandler.java` — itera UsuarioMusica e publica `atualizado` no Outbox.
- `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/commands/handlers/ReplicarUsuariosMusicaSnapshotCommandHandlerTest.java` — unit test do backfill.
- `services/arrecadacao-api/arrecadacao-application/src/test/java/br/com/ecad/arrecadacao/application/events/UsuarioMusicaIntegrationEventMapperTest.java` — unit test do mapper.
- `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/integration/UsuarioMusicaEventOutboxIT.java` — IT (clone do RubricaEventOutboxIT) validando eventos criado/atualizado no Outbox.

**A Modificar:**
- `.../commands/handlers/CriarUsuarioMusicaCommandHandler.java` — injetar `OutboxEventWriter`, publicar `arrecadacao.usuario-musica.criado`.
- `.../commands/handlers/AtualizarUsuarioMusicaCommandHandler.java` — publicar `...atualizado`.
- `.../commands/handlers/AtivarUsuarioMusicaCommandHandler.java` — publicar `...atualizado`.
- `.../commands/handlers/InativarUsuarioMusicaCommandHandler.java` — publicar `...atualizado`.
- `.../api/controllers/UsuarioMusicaController.java` — adicionar `POST /manutencao/replicar-snapshot` (gated por permissão de manutenção).
- Testes unitários dos 4 handlers (`Criar/Atualizar/Ativar/InativarUsuarioMusicaCommandHandlerTest`) — adicionar mock de `OutboxEventWriter` e asserção de evento.
- `services/arrecadacao-api/arrecadacao-tests/.../api/UsuarioMusicaEndpointsIntegrationTest.java` — ajustar wiring do novo endpoint/mock.

**Referência:**
- `.../commands/handlers/CriarRubricaCommandHandler.java` · `AtualizarRubricaCommandHandler.java` — molde do pattern outbox.
- `.../domain/interfaces/OutboxEventWriter.java` · `.../infra/events/OutboxEventWriterImpl.java` · `RabbitMqPublisher.java` — infra existente.
- `.../domain/entities/OutboxEvent.java` — `routingKey = type`.
- `.../domain/entities/UsuarioMusica.java` · `.../valueobjects/Cnpj.java` — fonte dos campos.

### Identificação — .NET (Consumer + Projeção + Captação)

**A Criar:**
- `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/UsuarioMusicaSnapshot.cs` — entidade de projeção.
- `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IUsuarioMusicaSnapshotRepository.cs` — repo interface (`UpsertAsync`, `BuscarAsync`, `GetByAtualizadoEmGuard`).
- `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/UsuarioMusicaSnapshotRepository.cs` — implementação EF.
- `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/UsuarioMusicaSnapshotConfiguration.cs` — mapeamento tabela.
- `services/identificacao-api/4-Infra/Identificacao.Infra/Events/ArrecadacaoUsuarioMusicaEventConsumer.cs` — BackgroundService consumer.
- `services/identificacao-api/2-Application/Identificacao.Application/UsuariosMusica/Queries/BuscarUsuariosMusicaQuery.cs` + `Handler`.
- `services/identificacao-api/2-Application/Identificacao.Application/UsuariosMusica/Responses/UsuarioMusicaSnapshotResponse.cs`.
- `services/identificacao-api/1-Services/Identificacao.API/Endpoints/UsuarioMusicaEndpoints.cs` — `GET /api/v1/usuarios-musica`.
- EF Migration `AddUsuarioMusicaSnapshotAndCaptacaoRef` (snapshot table + colunas/remoção na Captacao).
- Testes unitários: `ArrecadacaoUsuarioMusicaEventConsumerTests`, `BuscarUsuariosMusicaQueryHandlerTests`, `UsuarioMusicaSnapshotRepositoryTests`.
- Teste de integração do consumer + endpoint de busca.

**A Modificar:**
- `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs` — `DbSet<UsuarioMusicaSnapshot>`.
- `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` — `UsuarioDeMusica` → `UsuarioMusicaId` + `UsuarioMusicaNome`; `Criar`/`Atualizar`.
- `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/CaptacaoConfiguration.cs` — mapeamento das novas colunas.
- `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CaptacaoEndpoints.cs` — requests (`UsuarioMusicaId`+`UsuarioMusicaNome`); param `usuarioMusicaId` no GET list.
- `.../Captacoes/Commands/CriarCaptacaoCommand.cs` + `Handler` — novos campos/validação.
- `.../Captacoes/Commands/AtualizarCaptacaoCommand.cs` + `Handler`.
- `.../Captacoes/Responses/CaptacaoResponse.cs` — add `UsuarioMusicaId`.
- `.../Captacoes/Queries/ListarCaptacoesQuery.cs` + `Handler` — filtro `usuarioMusicaId`; mapear `UsuarioMusicaNome`.
- `.../Captacoes/Queries/GetCaptacaoByIdQueryHandler.cs` — mapear novos campos.
- `.../Cancelamento/Commands/CancelarRolCommandHandler.cs` — payload do evento (linha 74).
- `.../Fechamento/Commands/FecharRolCommandHandler.cs` + `Fechamento/Payloads/RolFechadoPayload.cs` — add `UsuarioMusicaId`+`UsuarioMusicaNome` ao payload.
- `.../Audit/IdentificacaoAuditMappers.cs` — campos de auditoria.
- `3-Domain/.../Interfaces/ICaptacaoRepository.cs` + impl — filtro `usuarioMusicaId` em `ListarAsync`.
- `1-Services/Identificacao.API/Program.cs` — `AddHostedService<ArrecadacaoUsuarioMusicaEventConsumer>()`; config `ARRECADACAO_EXCHANGE`.
- `1-Services/Identificacao.API/Authorization/IdentificacaoPermissions.cs` — permissão de leitura do endpoint de busca (se nova).
- Testes existentes: `CaptacaoTests`, `CriarCaptacaoCommandHandlerTests`, `AtualizarCaptacaoCommandHandlerTests`, IT fixtures (`IdentificacaoApiFactory`).

**Referência:**
- `.../Events/DistribuicaoEventConsumer.cs` — molde exato do consumer.
- `.../Events/IdentityUserEventConsumer.cs` — segundo exemplo de consumer + reconexão.

### Frontend — React/TS

**A Criar:**
- `frontend/src/features/identificacao/captacoes/types/usuario-musica-snapshot.ts` — tipo do snapshot.
- `frontend/src/features/identificacao/captacoes/api/usuariosMusicaApi.ts` — `buscarUsuariosMusica(q, cnpj?)` via `apiGetIden`.
- `frontend/src/features/identificacao/captacoes/hooks/useBuscaUsuariosMusica.ts` — query debounced (TanStack).

**A Modificar:**
- `frontend/src/features/identificacao/captacoes/types/captacao.ts` — `Captacao`/`CriarCaptacaoRequest`/`AtualizarCaptacaoRequest` (`usuarioMusicaId`+`usuarioMusicaNome`); `CaptacaoFiltros` add `usuarioMusicaId`.
- `frontend/src/features/identificacao/captacoes/api/captacoesApi.ts` — param `usuarioMusicaId` em `getCaptacoes`.
- `frontend/src/features/identificacao/captacoes/components/CaptacaoForm.tsx` — `TextInput` → `Autocomplete` (debounce ≥2 chars, onSelect popula id+nome, validação obrigatória).
- `frontend/src/features/identificacao/captacoes/components/CaptacaoFilters.tsx` — add Autocomplete de filtro.
- `frontend/src/features/identificacao/captacoes/components/CaptacoesTable.tsx` — exibir `usuarioMusicaNome`.
- `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` — exibir `usuarioMusicaNome`.

**Referência:**
- `frontend/src/features/arrecadacao/licencas/components/LicencaForm.tsx` — molde do Autocomplete + debounce + TanStack query.
- `frontend/src/shared/components/ui/autocomplete/` — componente reutilizável.
- `frontend/src/shared/services/apiIdentificacaoClient.ts` — `apiGetIden`.

### Documentação
- Atualizar `domains/arrecadacao/domain.md` (§7 eventos: add `arrecadacao.usuario-musica.criado/atualizado`).
- Atualizar `domains/identificacao/domain.md` (entidade Captação: texto livre → referência com snapshot).

---

*Para gerar as tarefas de implementação, use a skill `task-creator`.*
