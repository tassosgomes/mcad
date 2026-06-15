---
status: pending
parallelizable: false
blocked_by: ["11.0", "12.0", "14.0", "15.0"]
---

<task_context>
<domain>cadastro/testing,observability</domain>
<type>testing</type>
<scope>performance</scope>
<complexity>medium</complexity>
<dependencies>database,http_server</dependencies>
<unblocks>[]
</unblocks>
</task_context>

# Tarefa 16.0: Testes de Integração Fim-a-Fim + Observabilidade

## Visão Geral

Cobrir os fluxos cross-feature que envolvem múltiplas tarefas: o fluxo completo do titular (auto-cadastro → login → contato → obras → ocorrência → acompanhamento) e do analista (triagem → resolução), além da infraestrutura de observabilidade transversal (métricas Prometheus, scopes de log, sanitização LGPD). Os testes unitários por feature já foram incluídos nas tarefas 1.0–12.0; esta tarefa cobre integração E2E e qualidade de produção.

## Requisitos

- Tech Spec — seção *Abordagem de Testes* (Integração) e *Monitoramento e Observabilidade*
- RF-24 (isolamento entre titulares), RF-31 (ocorrências isoladas), RF-37 (state machine)

## Subtarefas

### Testes de Integração (Backend)

- [ ] 16.1 Estender `5-Tests/Cadastro.IntegrationTests/Fixtures/CadastroApiFactory.cs` com um `TestTitularAuthHandler` — espelha o `TestAuthHandler` existente, mas injeta claims `sub=titularId` no scheme **"Titular"**. Permitir configurar qual `titularId` simular via header `X-Test-Titular-Id`.
- [ ] 16.2 Criar `PortalFluxoCompletoIntegrationTests.cs` — fluxo HTTP completo:
  1. `POST /portal/auto-cadastro` (sem token) → 201.
  2. `POST /portal/auth/login` → 200 com token.
  3. `GET /portal/me` com token titular → 200.
  4. `PUT /portal/me/contato` com dados válidos → 200; `GET /portal/me` reflete a mudança.
  5. `GET /portal/minhas-obras` → retorna apenas obras do titular (RF-24).
  6. `POST /portal/ocorrencias` → 201.
  7. Verificar row em `outbox_events` com `type = 'cadastro.ocorrencia.aberta'`.
- [ ] 16.3 Criar `PortalIsolamentoIntegrationTests.cs`:
  - Titular A tenta `GET /portal/ocorrencias` → vê apenas as suas; não consegue acessar ocorrência do titular B (se houver endpoint por id, retorna 403/404) (RF-31).
  - Titular A não vê obras do titular B (RF-24).
- [ ] 16.4 Criar `PortalAuthIntegrationTests.cs`:
  - `POST /portal/auto-cadastro` e `POST /portal/auth/login` acessíveis sem token.
  - Demais endpoints `/portal/*` sem token → 401.
  - 5 logins falhados → lockout exponencial ativo.
  - Token do scheme Keycloak **não** autentica no scheme Titular (e vice-versa).
- [ ] 16.5 Criar `OcorrenciaStateMachineIntegrationTests.cs`:
  - Analista (scheme Keycloak via `X-Test-Permissions`) move `ABERTA → EM_ANALISE → RESOLVIDA`.
  - `RESOLVIDA → ABERTA` → 422.
  - Sem permissão → 403.
- [ ] 16.6 Criar `SolicitacaoAprovacaoIntegrationTests.cs`:
  - Titular abre solicitação de associação sem destino → 422 (RF-20).
  - Analista aprova solicitação de nome → titular reflete o novo nome; auditoria registra diff.
  - Analista sem permissão → 403.
- [ ] 16.7 Criar `PortalOutboxIntegrationTests.cs` — verificar eventos em `outbox_events` após `POST /portal/ocorrencias` (`cadastro.ocorrencia.aberta`) e `PUT /portal/me/contato` (`cadastro.titular.contato.atualizado`).
- [ ] 16.8 Criar `AuthRegressionIntegrationTests.cs` — validar que endpoints internos (`GET /api/v1/titulares`) continuam exigindo token Keycloak (não aceitam token do scheme Titular) — confirma que a adição do scheme "Titular" não quebrou o scheme default.

### Observabilidade

- [ ] 16.9 Revisar scopes de log nos handlers de login/contato/solicitação — usar `_logger.BeginScope("{TitularId}", titularId)`. **Nunca** logar CPF/CNPJ/senha. Validar com grep/busca que nenhum `logger.Log*` inclui documento ou senha.
- [ ] 16.10 Expor métricas Prometheus (já que `Prometheus.AspNetCore.HttpMetrics` está presente):
  - Contador `portal_login_attempts_total` com label `result` (`success|invalid|locked`).
  - Contador `portal_ocorrencias_abertas_total`.
  - Contador `portal_solicitacoes_aprovadas_total`.
  - Registrar no DI e validar que aparecem em `GET /metrics`.
- [ ] 16.11 Validar sanitização LGPD: `DocumentoMasking` aplicado em respostas de API (CPF/CNPJ mascarados exceto para quem tem `TitularVerCpfCompleto`). Confirmar que `GET /portal/me` mascara o documento do titular.
- [ ] 16.12 Confirmar que o health check `/health` permanece acessível (sem novo check necessário — DB/RabbitMQ já cobertos).

### E2E Frontend (opcional, se Playwright configurado)

- [ ] 16.13 Se o projeto tiver Playwright (verificar `frontend/playwright.config.ts` ou similar), adicionar um smoke test E2E: navegar para `/portal/login`, preencher credenciais de teste, verificar redirect para dashboard.

## Sequenciamento

- Bloqueado por: 11.0, 12.0 (endpoints de analista), 14.0, 15.0 (frontend)
- Desbloqueia: Nenhum (tarefa final)
- Paralelizável: Não (depende de todo o backend e frontend)

## Detalhes de Implementação

**`TestTitularAuthHandler`:** a `CadastroApiFactory` já substitui o auth scheme default por `TestAuthHandler`. Para o scheme "Titular", criar um handler análogo que lê `X-Test-Titular-Id` do header e constrói um `ClaimsPrincipal` com claim `sub = titularId` autenticado no scheme "Titular". Registrar via `builder.ConfigureTestServices(s => s.AddAuthentication("Titular").AddScheme<...>("Titular", ...))`.

**Validação de outbox:** o `CadastroApiFactory` já mocka `IRabbitMqPublisher`, mas o `OutboxEvent` é persistido na tabela `outbox_events` (escrita pelo `OutboxEventWriter` no DbContext). Após um `POST`, consultar `context.OutboxEvents` diretamente no teste para verificar o evento.

**Métricas:** usar `Meter` / `Counter<T>` do `System.Diagnostics.Metrics` (já suportado pelo Prometheus exporter). Exemplo:

```csharp
private static readonly Counter<int> LoginAttempts = new Meter("portal").CreateCounter<int>("login_attempts_total");
LoginAttempts.Add(1, new KeyValuePair<string,object?>("result", "success"));
```

## Critérios de Sucesso

- Fluxo completo titular (auto-cadastro → login → contato → obras → ocorrência) passa em teste de integração.
- Isolamento entre titulares validado (RF-24, RF-31).
- State machine de ocorrências enforced na API (RF-37).
- Eventos outbox presentes após mutações (RF-13, RF-32, RF-39).
- Sem regressão no auth Keycloak interno (endpoints `/api/v1/*` continuam protegidos).
- Métricas Prometheus expostas em `/metrics`.
- Nenhum CPF/CNPJ/senha em logs.
- `dotnet test 5-Tests/Cadastro.IntegrationTests` passa (com Testcontainers PostgreSQL disponível).
