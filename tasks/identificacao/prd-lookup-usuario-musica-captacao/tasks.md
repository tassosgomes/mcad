# Resumo de Tarefas de Implementação — Lookup de Usuário de Música em Captações

## Visão Geral

Conjunto de tarefas para substituir o campo de texto livre "Usuário de Música" na Identificação por um lookup contra uma **projeção local** alimentada via eventos da Arrecadação (event-driven ACL). Implementação cross-domínio: produtor Java (D03), consumidor/projeção .NET (D02), frontend React.

**PRD:** `tasks/identificacao/prd-lookup-usuario-musica-captacao/prd.md`
**TechSpec:** `tasks/identificacao/prd-lookup-usuario-musica-captacao/techspec.md`

## Skills de Stack Consultadas

| Skill | Stack | Como Influencia as Tasks |
|---|---|---|
| `dotnet-architecture` | .NET | Camadas numeradas, CQRS nativo (Command/Query/Handler/Dispatcher), Repository+EF, FluentValidation, namespaces sem prefixo numérico |
| `dotnet-testing` | .NET | xUnit + AwesomeAssertions + Moq, AAA, naming `Method_Condition_Behavior`, Testcontainers PostgreSQL |
| `java-testing` | Java | JUnit 5 + AssertJ + Mockito, AAA, naming `method_Condition_Behavior`, Spring Boot Test + Testcontainers |
| `react-code-quality` | React | Inglês, PascalCase componentes, camelCase hooks, strict sem `any`, max ~300 linhas |
| `react-testing` | React | Vitest + RTL + jest-dom, MSW para mock de API, queries semânticas |

## Fases de Implementação

### Fase 1 — Arrecadação: Produtor de Eventos (D03)
Publicação de eventos `arrecadacao.usuario-musica.criado/atualizado` via Outbox nos 4 handlers + endpoint de backfill. Desbloqueia todo o resto (eventos devem existir para consumir).

### Fase 2 — Identificação: Projeção + Consumer + Busca (D02)
Tabela de read model, consumer RabbitMQ idempotente, endpoint de busca local contra a projeção.

### Fase 3 — Identificação: Mudança de Schema da Captação
Captação troca texto livre por `UsuarioMusicaId` + `UsuarioMusicaNome`; ajuste de commands/queries/responses/eventos.

### Fase 4 — Frontend + Documentação
Autocomplete no form e filtros, tipos, hooks. Atualização dos domain docs.

## Tarefas

- [x] 1.0 Arrecadação — Publicar eventos de Usuário de Música no Outbox (RF-01)
- [x] 2.0 Arrecadação — Endpoint de backfill para snapshot (RF-02 suporte)
- [x] 3.0 Identificação — Projeção local + Consumer RabbitMQ idempotente (RF-02)
- [x] 4.0 Identificação — Endpoint de busca local de Usuários de Música (RF-03)
- [x] 5.0 Identificação — Persistência de referência na Captação (RF-04)
- [x] 6.0 Identificação — Contrato do evento rol.fechado com usuarioMusicaId (RF-07)
- [ ] 7.0 Frontend — Autocomplete no CaptacaoForm, Filtros e Tabela (RF-05, RF-06)
- [ ] 8.0 Documentação — Atualizar Domain Docs de Arrecadação e Identificação

## Matriz de Execução por Agente

| Task | Risco | Modo | Modelo | Validação | Contexto | Observação |
|------|-------|------|--------|-----------|----------|------------|
| 1.0 | medium | standard | standard | unit | medium | Reutiliza molde Rubrica; 4 handlers + mapper compartilhado |
| 2.0 | low | standard | standard | unit | small | Endpoint de manutenção; itera usuários e publica no Outbox |
| 3.0 | high | strict | strong | full | large | Consumer BackgroundService complexo; idempotência + guard atualizadoEm |
| 4.0 | low | standard | standard | unit | small | Query CQRS simples contra projeção local |
| 5.0 | high | strict | strong | full | large | Migration breaking; cascata de mudanças em commands/queries/responses |
| 6.0 | low | standard | standard | unit | small | Campo aditivo no payload; compatível retroativo |
| 7.0 | medium | standard | standard | unit | medium | Reaproveita Autocomplete do LicencaForm; MSW para mock |
| 8.0 | low | standard | standard | smoke | small | Atualização textual de domain docs |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Arrecadação) | 1.0 → 2.0 | Produtor Java; independente até o broker |
| Lane B (Identificação) | 3.0 → 4.0 → 5.0 → 6.0 | Consumidor/projeção .NET; serial dentro do serviço |
| Lane C (Frontend) | 7.0 | Pode iniciar tipos/hooks após 4.0 pronto; UI final após 5.0 |
| Lane D (Docs) | 8.0 | Independente; paralela a qualquer fase |

> Lane A e Lane B iniciam em paralelo APENAS se 1.0 for entregue primeiro (eventos devem existir no broker para o consumer testar). Na prática: 1.0 primeiro, depois 2.0 ∥ 3.0 em paralelo.

### Caminho Crítico

`1.0 → 3.0 → 4.0 → 5.0 → 7.0` (produtor → consumer → busca → captação → frontend)

### Diagrama de Dependências

```
1.0 (eventos D03) ──┬──► 2.0 (backfill)
                    │
                    └──► 3.0 (projeção+consumer) ──► 4.0 (endpoint busca)
                                                    │
                                                    └──► 5.0 (captação schema) ──► 6.0 (rol.fechado)
                                                                                   │
                                                          4.0 + 5.0 ─────────────►┴──► 7.0 (frontend)

8.0 (docs) ──── paralelo a tudo
```

---

## Validação Cruzada

### A) Cobertura de Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Publicação de eventos (Arrecadação) | 1.0 | ✅ Coberto |
| RF-02 — Projeção local + consumer (Identificação) | 3.0 | ✅ Coberto |
| RF-03 — Endpoint de busca local | 4.0 | ✅ Coberto |
| RF-04 — Persistência de referência na Captação | 5.0 | ✅ Coberto |
| RF-05 — Autocomplete no formulário | 7.0 | ✅ Coberto |
| RF-06 — Filtro por usuário na lista | 7.0 | ✅ Coberto |
| RF-07 — Contrato do evento rol.fechado | 6.0 | ✅ Coberto |

### B) Cobertura de Componentes da TechSpec (Inventário de Artefatos)

| Artefato | Task | Status |
|----------|------|--------|
| `UsuarioMusicaIntegrationEventMapper.java` | 1.0 | ✅ |
| Outbox nos 4 handlers UsuarioMusica (Java) | 1.0 | ✅ |
| `ReplicarUsuariosMusicaSnapshotCommand/Handler` | 2.0 | ✅ |
| `UsuarioMusicaController` endpoint manutenção | 2.0 | ✅ |
| `UsuarioMusicaSnapshot.cs` + repo + config | 3.0 | ✅ |
| `ArrecadacaoUsuarioMusicaEventConsumer.cs` | 3.0 | ✅ |
| `IdentificacaoDbContext` (DbSet snapshot) | 3.0 | ✅ |
| Migration (snapshot + captação) | 3.0, 5.0 | ✅ |
| `BuscarUsuariosMusicaQuery/Handler` + endpoint | 4.0 | ✅ |
| `Captacao.cs` (UsuarioMusicaId + Nome) | 5.0 | ✅ |
| `CaptacaoConfiguration.cs` | 5.0 | ✅ |
| `CaptacaoEndpoints.cs` (requests + filtro) | 5.0 | ✅ |
| `Criar/AtualizarCaptacaoCommand` + handlers | 5.0 | ✅ |
| `CaptacaoResponse.cs` | 5.0 | ✅ |
| `ListarCaptacoesQuery/Handler` (filtro) | 5.0 | ✅ |
| `CancelarRolCommandHandler` (payload) | 6.0 | ✅ |
| `RolFechadoPayload.cs` + `FecharRolCommandHandler` | 6.0 | ✅ |
| `IdentificacaoAuditMappers.cs` | 5.0 | ✅ |
| `Program.cs` (consumer registration + config) | 3.0 | ✅ |
| Frontend: tipos, API client, hooks | 7.0 | ✅ |
| Frontend: CaptacaoForm, CaptacaoFilters, tabela | 7.0 | ✅ |
| Domain docs (D02, D03) | 8.0 | ✅ |

### C) Cobertura de Categorias Obrigatórias

| # | Categoria | Status | Task |
|---|-----------|--------|------|
| 1 | Setup / Configuração | ✅ | 3.0 (`ARRECADACAO_EXCHANGE`, Program.cs) |
| 2 | Modelos de Dados | ✅ | 3.0 (projeção), 5.0 (captação) |
| 3 | Lógica de Negócio | ✅ | 1.0–7.0 (RF-01 a RF-07) |
| 4 | Endpoints / Interfaces | ✅ | 2.0 (backfill), 4.0 (busca), 5.0 (captação) |
| 5 | Integrações Externas | ✅ | 3.0 (RabbitMQ consumer) |
| 6 | Validações e Erros | ✅ | 3.0 (consumer nack/reconnect), 5.0 (FluentValidation) |
| 7 | Testes | ✅ | subtarefas em cada task |
| 8 | Observabilidade | ✅ | 3.0 (logs consumer) |
| 9 | Documentação | ✅ | 8.0 (domain docs) |
| 10 | Segurança | ✅ | 2.0 (perm manutenção), 4.0 (perm leitura) |
