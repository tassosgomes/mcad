# Comunicação entre Serviços — mcad

> Documento de referência sobre como os serviços se comunicam: APIs REST síncronas, mensageria assíncrona (RabbitMQ), dependências de infraestrutura e o fluxo completo frontend → BFF → microserviços → serviços externos.

---

## Índice

1. [Visão Geral do Ecossistema](#1-visão-geral-do-ecossistema)
2. [Inventário de Serviços](#2-inventário-de-serviços)
3. [Frontend → BFF](#3-frontend--bff)
4. [BFF → Microserviços e Serviços Externos](#4-bff--microserviços-e-serviços-externos)
5. [APIs REST por Serviço](#5-apis-rest-por-serviço)
6. [Mensageria Assíncrona — RabbitMQ](#6-mensageria-assíncrona--rabbitmq)
7. [Padrão Outbox](#7-padrão-outbox)
8. [Dependências de Banco de Dados](#8-dependências-de-banco-de-dados)
9. [Dependências de Infraestrutura](#9-dependências-de-infraestrutura)
10. [Serviços Externos — ecad-authz](#10-serviços-externos--ecad-authz)
11. [Serviços Externos — ecad-auditoria](#11-serviços-externos--ecad-auditoria)
12. [Fluxo de Autorização (PDP)](#12-fluxo-de-autorização-pdp)
13. [Fluxo de Auditoria](#13-fluxo-de-auditoria)
14. [Topologia Docker Compose](#14-topologia-docker-compose)
15. [Matriz de Dependências](#15-matriz-de-dependências)

---

## 1. Visão Geral do Ecossistema

O **mcad** (mini-ECAD) é composto por serviços próprios e dois serviços externos compartilhados:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                                            │
│  React 19 + TanStack Query + React Router 7  (port 5173)                           │
└───────────────────────────────────┬─────────────────────────────────────────────────┘
                                    │  HTTPS / OIDC (Logto)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  BFF — Node.js/Fastify  (port 5200)                                                │
│  Proxy reverso + agregação + contexto de autorização + logging de auditoria        │
└───┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┘
    │          │          │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼          ▼          ▼
 cadastro  identif.  arrecad.  distribui.  ai-orch.  ecad-authz  ecad-auditoria
 :5001     :5100     :5003     :5004       :5300     (externo)   (externo)
 .NET 8    .NET 8    Java/SB   Java/SB     Node.js   Java/SB     Java/SB
                                                      +Redis      +Oracle

    Todos os serviços publicam eventos via Outbox → RabbitMQ
    Todos os serviços lêem/escrevem no PostgreSQL (schema próprio)
    ecad-authz usa PostgreSQL próprio + Redis
    ecad-auditoria usa Oracle
```

---

## 2. Inventário de Serviços

| Serviço | Porta | Tecnologia | Repositório | Status |
|---------|-------|------------|------------|--------|
| **frontend** | 5173 | React 19 + Vite + TypeScript | mcad | em produção |
| **bff** | 5200 | Node.js 20 + Fastify 5 + TypeScript | mcad | em produção |
| **cadastro-api** | 5001 | .NET 8 Minimal API + EF Core | mcad | em produção |
| **identificacao-api** | 5100 | .NET 8 Minimal API + EF Core | mcad | em andamento |
| **arrecadacao-api** | 5003 | Java 21 + Spring Boot 3.3 | mcad | em andamento |
| **distribuicao-api** | 5004 | Java 21 + Spring Boot 3.3 | mcad | em andamento |
| **ai-orchestrator** | 5300 | Node.js 20 + Fastify + Mastra | mcad | em andamento |
| **identity-sync-api** | — | Node.js 20 + Fastify | mcad | em produção |
| **ecad-authz** | 8085 (dev) | Java 21 + Spring Boot 3.2 | ecad-authz | externo |
| **ecad-auditoria** | 8080/5003 | Java 21 + Spring Boot 3.5 | ecad-auditoria | externo |

---

## 3. Frontend → BFF

### Autenticação OIDC

O frontend implementa o fluxo Authorization Code + PKCE diretamente com o provedor de identidade:

```
Browser                         Logto / Keycloak (IdP)
  │── redirect /authorize ─────────────────────────────▶│
  │◀─ authorization_code ────────────────────────────────│
  │── POST /token (code) ───────────────────────────────▶│
  │◀─ access_token (JWT) + id_token ────────────────────│
```

- **Produção:** Logto (`https://9lcinu.logto.app/oidc`)
- **Dev local:** Keycloak (`http://localhost:8080/realms/mcad`) ou Logto cloud
- **Biblioteca:** `oidc-client-ts` via `@axa-fr/react-oidc`
- **Token storage:** Gerenciado pela biblioteca (memória + session storage)

### Clientes HTTP do Frontend

O frontend resolve URLs em tempo de execução via `runtimeConfig.ts`:

```typescript
// frontend/src/shared/config/runtimeConfig.ts
export const runtimeConfig = {
  cadastroApiBaseUrl:    getRuntimeValue('CADASTRO_API_BASE_URL',    '/api/cadastro/v1'),
  identificacaoApiBaseUrl: getRuntimeValue('IDENTIFICACAO_API_BASE_URL', '/api/identificacao/v1'),
  arrecadacaoApiBaseUrl: getRuntimeValue('ARRECADACAO_API_BASE_URL', '/api/arrecadacao/v1'),
  distribuicaoApiBaseUrl: getRuntimeValue('DISTRIBUICAO_API_BASE_URL', '/api/distribuicao/v1'),
  auditoriaApiBaseUrl:   getRuntimeValue('AUDITORIA_API_BASE_URL',   '/api/auditoria/v1'),
  authzApiBaseUrl:       getRuntimeValue('AUTHZ_API_BASE_URL',       '/api/authz/v1'),
  oidcAuthority:         getRuntimeValue('OIDC_AUTHORITY'),
  oidcClientId:          getRuntimeValue('OIDC_CLIENT_ID'),
}
```

Em desenvolvimento, todos os caminhos relativos (`/api/*`) são resolvidos contra o BFF na porta 5200. Em produção, o Nginx/Traefik aponta para o BFF.

### Injeção de Token

Todos os `fetch` são interceptados por `authenticatedFetch.ts`, que injeta o header JWT:

```typescript
// frontend/src/shared/services/authenticatedFetch.ts
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'X-Correlation-Id': generateUUID(),  // rastreio de requisição
}
```

### Clientes por Domínio

| Arquivo | Base URL configurada | Serviço alvo |
|---------|---------------------|--------------|
| `apiClient.ts` | `/api/cadastro/v1` | cadastro-api via BFF |
| `apiIdentificacaoClient.ts` | `/api/identificacao/v1` | identificacao-api via BFF |
| `apiArrecadacaoClient.ts` | `/api/arrecadacao/v1` | arrecadacao-api via BFF |
| `apiDistribuicaoClient.ts` | `/api/distribuicao/v1` | distribuicao-api via BFF |
| `apiAuditoriaClient.ts` | `/api/auditoria/v1` | ecad-auditoria via BFF |
| `apiAuthzClient.ts` | `/api/authz/v1` | ecad-authz via BFF |
| `apiBffClient.ts` | `/api` | rotas próprias do BFF (me, permissões, dashboard) |

### Fluxo de uma Requisição Típica

```
Browser
  │  GET /api/cadastro/v1/obras
  │  Authorization: Bearer <jwt>
  │  X-Correlation-Id: <uuid>
  ▼
BFF (:5200)
  │  Valida presença do JWT
  │  Sanitiza headers do cliente (remove x-mcad-* vindos do browser)
  │  Injeta X-Correlation-Id se ausente
  │  Proxy → http://localhost:5001/api/v1/obras
  ▼
cadastro-api (:5001)
  │  Valida JWT (ecad-authz SDK ou Keycloak)
  │  Verifica permissão: cadastro:default:obra:listar
  │  Consulta PostgreSQL (schema cadastro)
  │  Retorna 200 OK + JSON
  ▼
BFF
  │  Publica evento SCREEN_ACCESS no ecad-auditoria (assíncrono)
  │  Adiciona headers de resposta: x-audit-*, x-authz-version
  │  Retorna resposta ao browser
  ▼
Browser
  │  Renderiza lista de obras
```

---

## 4. BFF → Microserviços e Serviços Externos

### Tabela de Proxies Configurados

Arquivo de configuração: `services/bff/src/config.ts`

| Prefixo (browser) | Upstream (BFF → serviço) | Serviço |
|-------------------|--------------------------|---------|
| `/api/cadastro/v1/*` | `http://localhost:5001/api/v1/` | cadastro-api |
| `/api/identificacao/v1/*` | `http://localhost:5100/api/v1/` | identificacao-api |
| `/api/arrecadacao/v1/*` | `http://localhost:5003/api/v1/` | arrecadacao-api |
| `/api/distribuicao/v1/*` | `http://localhost:5004/api/v1/` | distribuicao-api |
| `/api/auditoria/v1/*` | `https://api-audit.tasso.dev.br/api/v1/` | ecad-auditoria |
| `/api/authz/v1/*` | `https://mcad-authz.tasso.dev.br/v1/` | ecad-authz |
| `/api/ai/v1/*` | `http://localhost:5300/v1/` | ai-orchestrator |
| `/v1/*` (legado) | `https://mcad-authz.tasso.dev.br/v1/` | ecad-authz |

### Rotas Próprias do BFF (não são proxy)

| Rota | Método | Descrição |
|------|--------|-----------|
| `GET /health/live` | GET | Liveness probe |
| `GET /health/ready` | GET | Readiness (verifica upstreams) |
| `GET /metrics` | GET | Métricas Prometheus |
| `GET /api/me` | GET | Contexto do usuário autenticado (nome, email, roles) — **cache 60s** |
| `GET /api/me/permissions` | GET | Permissões efetivas do usuário — **cache com X-Authz-Version** |
| `GET /api/acessos/*` | GET | Endpoints que o usuário pode acessar (para UI) |
| `GET /api/historico/*` | GET | Histórico de acessos |
| `GET /api/auditoria/*` | GET/POST | Consulta e log de eventos de auditoria |
| `POST /api/authz/permission-lifecycle/*` | POST | Ciclo de vida de permissões |
| `GET /api/dashboard/*` | GET | Agregação cross-service de dashboard |

### Comportamentos do BFF

**Cache de contexto de usuário:**
- Chave: `sub` do JWT
- TTL: `ME_CACHE_TTL_SECONDS` (padrão 60s, máx 300s)
- Invalida com mudança de `X-Authz-Version`

**Logging de auditoria (screen access):**
- Para rotas auditáveis, o BFF publica `SCREEN_ACCESS` event para o ecad-auditoria após a resposta
- Limite de payload: `AUDIT_SCREEN_ACCESS_MAX_RESPONSE_BYTES` (1MB)
- Publicação é assíncrona (não bloqueia a resposta)

**Headers propagados para upstreams:**
- `Authorization: Bearer <token>` (original do browser)
- `X-Correlation-Id: <uuid>`
- `X-Forwarded-For`

**Headers removidos do browser antes do proxy:**
- `x-mcad-*` (headers internos não devem vir do cliente)

**Headers adicionados na resposta ao browser:**
- `x-audit-event-id`
- `x-authz-version`

---

## 5. APIs REST por Serviço

### 5.1 cadastro-api (:5001)

Base URL: `http://localhost:5001/api/v1`

| Endpoint | Métodos | Permissão exigida | Descrição |
|----------|---------|-------------------|-----------|
| `/associacoes` | GET | `cadastro:default:associacao:listar` | Lista associações |
| `/associacoes/{id}` | GET | `cadastro:default:associacao:visualizar` | Detalhe de associação |
| `/titulares` | GET, POST | `cadastro:default:titular:listar/criar` | CRUD de titulares |
| `/titulares/{id}` | GET, PUT, DELETE | `cadastro:default:titular:visualizar/editar/excluir` | Detalhe/editar/excluir titular |
| `/obras` | GET, POST | `cadastro:default:obra:listar/criar` | CRUD de obras musicais |
| `/obras/{id}` | GET, PUT, DELETE | `cadastro:default:obra:visualizar/editar/excluir` | Detalhe/editar/excluir obra |
| `/fonogramas` | GET, POST | `cadastro:default:fonograma:listar/criar` | CRUD de fonogramas |
| `/fonogramas/{id}` | GET, PUT, DELETE | `cadastro:default:fonograma:visualizar/editar/excluir` | Detalhe/editar/excluir fonograma |
| `/titularidades` | GET, POST | `cadastro:default:titularidade:listar/criar` | CRUD de titularidades |
| `/titularidades/{id}` | GET, PUT, DELETE | `cadastro:default:titularidade:visualizar/editar/excluir` | Detalhe/editar/excluir titularidade |
| `/participacoes` | GET, POST | `cadastro:default:participacao:listar/criar` | CRUD de participações |
| `/participacoes/{id}` | GET, PUT, DELETE | `cadastro:default:participacao:visualizar/editar/excluir` | Detalhe/editar/excluir participação |
| `/buscas/*` | GET | — | Busca cross-entidade |
| `/dashboard/*` | GET | — | Dados de dashboard |
| `/distribuicao/*` | GET | — | Consultas de distribuição via cadastro |

Localização dos endpoints: `services/cadastro-api/1-Services/Cadastro.API/Endpoints/*.cs`

### 5.2 identificacao-api (:5100)

Base URL: `http://localhost:5100/api/v1`

| Endpoint | Métodos | Permissão exigida | Descrição |
|----------|---------|-------------------|-----------|
| `/captacoes` | GET, POST | `identificacao:default:captacao:listar/criar` | CRUD de captações |
| `/captacoes/{id}` | GET, PUT, DELETE | `identificacao:default:captacao:visualizar/editar/excluir` | Detalhe/editar/excluir captação |
| `/captacoes/{id}/uploads` | GET, POST | `identificacao:default:upload:importar/listar` | Upload de CSV de execuções |
| `/captacoes/{id}/uploads/{uploadId}` | GET | `identificacao:default:upload:visualizar` | Detalhe do upload |
| `/captacoes/{id}/uploads/{uploadId}/erros` | GET | `identificacao:default:upload:visualizar-erros` | Erros de validação do upload |
| `/rubricas` | GET | `identificacao:default:rubrica:listar` | Lista rubricas (sincronizado de arrecadacao) |
| `/rubricas/{id}` | GET | `identificacao:default:rubrica:visualizar` | Detalhe de rubrica |
| `/execucoes` | GET, POST | `identificacao:default:execucao:listar/criar` | CRUD de execuções musicais |
| `/execucoes/{id}` | GET, PUT, DELETE | `identificacao:default:execucao:visualizar/editar/excluir` | Detalhe/editar/excluir execução |
| `/tipos-utilizacao` | GET | `identificacao:default:tipo-utilizacao:listar` | Tipos de utilização musical |
| `/pendentes` | GET | `identificacao:default:pendente:listar` | Itens pendentes de identificação |
| `/dashboard/*` | GET | — | Métricas de dashboard |
| `/fechamento/*` | POST | — | Encerramento de período |
| `/cancelamento/*` | POST | — | Cancelamento de captação |

Localização dos endpoints: `services/identificacao-api/1-Services/Identificacao.API/Endpoints/*.cs`

**Nota:** Os uploads de CSV são armazenados no MinIO (dev) / Cloudflare R2 (prod).

### 5.3 arrecadacao-api (:5003)

Base URL: `http://localhost:5003/api/v1`

| Endpoint | Métodos | Permissão exigida | Descrição |
|----------|---------|-------------------|-----------|
| `/rubricas` | GET, POST | `arrecadacao:default:rubrica:visualizar/criar` | CRUD de rubricas |
| `/rubricas/{id}` | GET, PUT | `arrecadacao:default:rubrica:visualizar/editar` | Detalhe/editar rubrica |
| `/pagamentos` | GET, POST | `arrecadacao:default:pagamento:listar/criar` | CRUD de pagamentos |
| `/pagamentos/{id}` | GET | `arrecadacao:default:pagamento:visualizar` | Detalhe de pagamento |
| `/verbas` | GET, POST | `arrecadacao:default:verba:listar/criar` | CRUD de verbas |
| `/verbas/{id}` | GET, PUT | `arrecadacao:default:verba:visualizar/editar` | Detalhe/editar verba |
| `/licencas` | GET, POST | `arrecadacao:default:licenca:listar/criar` | CRUD de licenças |
| `/licencas/{id}` | GET, PUT | `arrecadacao:default:licenca:visualizar/editar` | Detalhe/editar licença |
| `/usuarios-musica` | GET | — | Usuários de música |
| `/uda` | GET | — | Cálculos de Unidade de Distribuição por Arrecadação |
| `/dashboard/*` | GET | — | Métricas de dashboard |

Localização dos controllers: `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/*.java`

### 5.4 distribuicao-api (:5004)

Base URL: `http://localhost:5004/api/v1`

| Endpoint | Métodos | Permissão exigida | Descrição |
|----------|---------|-------------------|-----------|
| `/processos` | GET, POST | `distribuicao:default:processo:listar/criar` | CRUD de processos de distribuição |
| `/processos/{id}` | GET | `distribuicao:default:processo:visualizar` | Detalhe de processo |
| `/processos/{id}/calcular` | POST | `distribuicao:default:processo:calcular` | Executa cálculo de distribuição (F03) |
| `/processos/{id}/aprovar` | POST | `distribuicao:default:processo:aprovar` | Aprova processo |
| `/processos/{id}/finalizar` | POST | `distribuicao:default:processo:finalizar` | Finaliza processo |
| `/processos/{id}/cancelar` | POST | `distribuicao:default:processo:cancelar` | Cancela processo |
| `/processos/disponiveis` | GET | `distribuicao:default:processo:listar` | Processos disponíveis para cálculo |
| `/rubricas` | GET | `distribuicao:default:rubrica:visualizar` | Rubricas (cópia local sincronizada) |
| `/rubricas/{id}` | GET | `distribuicao:default:rubrica:visualizar` | Detalhe de rubrica |
| `/demonstrativos` | GET | — | Relatórios de distribuição |
| `/ajuste-estorno` | GET, POST | — | Ajustes e estornos |
| `/dashboard/*` | GET | — | Métricas de dashboard |

Localização dos controllers: `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/*.java`

### 5.5 ai-orchestrator (:5300)

Base URL: `http://localhost:5300/v1`

| Endpoint | Métodos | Descrição |
|----------|---------|-----------|
| `GET /health/live` | GET | Liveness |
| `GET /health/ready` | GET | Readiness (verifica OpenAI config) |
| `GET /metrics` | GET | Métricas Prometheus |
| `GET /audit-events` | GET | Lista eventos de auditoria |
| `POST /chat` | POST | Chat com o Copiloto IA (usa OpenAI + ferramentas) |
| `POST /workflows/{workflowId}/runs` | POST | Executa workflow: `explicar-obra`, `validar-distribuicao`, `preparar-acao-sensivel` |
| `POST /workflows/{workflowId}/runs/{runId}/resume` | POST | Retoma workflow suspenso (etapa de aprovação) |

O ai-orchestrator usa a biblioteca **Mastra** para orquestrar workflows. Chama ferramentas internas que fazem requisições REST para os outros microserviços (cadastro, distribuicao).

---

## 6. Mensageria Assíncrona — RabbitMQ

### Configuração do Broker

| Parâmetro | Valor (dev) | Variável de ambiente |
|-----------|-------------|---------------------|
| Host | `mcad-rabbitmq` (Docker) / `localhost` | `RABBITMQ_HOST` |
| Porta AMQP | 5672 | `RABBITMQ_PORT` |
| Management UI | 15672 | — |
| Virtual Host | `mcad` | `RABBITMQ_DEFAULT_VHOST` |
| Usuário | `mcad` | `RABBITMQ_DEFAULT_USER` |
| Senha | `mcad` | `RABBITMQ_DEFAULT_PASS` |
| Produção | CloudAMQP (`kebnekaise.lmq.cloudamqp.com`) | — |

### Mapa Completo de Exchanges, Filas e Roteamento

```
┌─────────────────────────────────────────────────────────────────────┐
│  EXCHANGE: cadastro.events  (topic, durable)                        │
│  Publisher: cadastro-api (via Outbox + OutboxPublisherWorker)       │
│                                                                     │
│  Routing Key                  │ Consumidor       │ Fila             │
│  ─────────────────────────────┼──────────────────┼──────────────── │
│  cadastro.obra.liberada       │ (futuro)         │ —               │
│  cadastro.obra.bloqueada      │ (futuro)         │ —               │
│  cadastro.obra.dominio-publico│ (futuro)         │ —               │
│  cadastro.obra.depurada       │ (futuro)         │ —               │
│  cadastro.fonograma.liberado  │ (futuro)         │ —               │
│  cadastro.fonograma.bloqueado │ (futuro)         │ —               │
│  cadastro.fonograma.depurado  │ (futuro)         │ —               │
│  cadastro.titular.criado      │ (futuro)         │ —               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  EXCHANGE: identity.events  (topic, durable)                        │
│  Publisher: identity-sync-api (sincroniza eventos do Logto/IdP)    │
│                                                                     │
│  Routing Key    │ Consumidor           │ Fila                       │
│  ───────────────┼──────────────────────┼─────────────────────────── │
│  identity.user.*│ cadastro-api         │ cadastro.identity.users    │
│  identity.user.*│ identificacao-api    │ identificacao.identity.users│
│  identity.user.*│ arrecadacao-api      │ (configurável via env)     │
│  identity.user.*│ ecad-authz           │ authz.identity.users       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  EXCHANGE: arrecadacao.events  (topic, durable)                     │
│  Publisher: arrecadacao-api (via Outbox)                           │
│                                                                     │
│  Routing Key                  │ Consumidor       │ Fila             │
│  ─────────────────────────────┼──────────────────┼──────────────── │
│  arrecadacao.rubrica.criada   │ distribuicao-api │ distribuicao.rubricas │
│  arrecadacao.rubrica.atualizada│ distribuicao-api│ distribuicao.rubricas │
│  arrecadacao.pagamento.estornado│distribuicao-api │ distribuicao.pagamento-estornado│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  EXCHANGE: distribuicao.events  (topic, durable)                    │
│  Publisher: distribuicao-api (via Outbox)                          │
│                                                                     │
│  Routing Key                  │ Consumidor       │ Fila             │
│  ─────────────────────────────┼──────────────────┼──────────────── │
│  distribuicao.rol.processado  │ identificacao-api│ identificacao.distribuicao.rol.processado│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  EXCHANGE: audit.events.exchange.v1  (topic, durable)               │
│  Publisher: todos os serviços via Ecad.Audit SDK (Outbox)          │
│  Publisher: ecad-authz (eventos de RBAC)                           │
│                                                                     │
│  Routing Key    │ Consumidor           │ Fila                       │
│  ───────────────┼──────────────────────┼─────────────────────────── │
│  audit.event.v1 │ ecad-auditoria       │ audit.events.ingest.v1     │
│                 │ (DLQ em falha)       │ audit.events.dlq.v1        │
│                 │ (DLX intermediário)  │ audit.events.dlx.v1        │
└─────────────────────────────────────────────────────────────────────┘
```

### Formato das Mensagens — CloudEvents 1.0

Todos os eventos do domínio seguem a especificação [CloudEvents 1.0](https://cloudevents.io/) em modo estruturado JSON:

```json
{
  "specversion": "1.0",
  "type": "arrecadacao.rubrica.criada",
  "source": "urn:arrecadacao-api",
  "subject": "rubrica/abc-123",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2026-06-13T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "rubricaId": "abc-123",
    "codigo": "EXEC-001",
    "descricao": "Execução Pública — Rádio",
    "criadaEm": "2026-06-13T14:30:00Z"
  }
}
```

**Atributos obrigatórios:**

| Atributo | Tipo | Exemplo | Origem |
|----------|------|---------|--------|
| `specversion` | string | `"1.0"` | fixo |
| `type` | string | `"cadastro.obra.liberada"` | `EventTypes` enum do serviço |
| `source` | URI | `"urn:cadastro-api"` | nome do serviço publicador |
| `subject` | string | `"obra/12345"` | tipo da entidade + ID |
| `id` | string (UUID) | `"550e8400-..."` | `OutboxEvent.Id` |
| `time` | ISO 8601 | `"2026-06-13T14:30:00Z"` | `OutboxEvent.CreatedAt` |
| `datacontenttype` | string | `"application/json"` | fixo |
| `data` | objeto | `{ ... }` | payload serializado do evento |

**Propriedades AMQP da mensagem:**

```
MessageId:    <event.Id>  (UUID)
ContentType:  application/cloudevents+json
DeliveryMode: Persistent  (sobrevive reinício do broker)
```

### Consumo de Mensagens

Todos os consumidores:
- Declaram a exchange e a fila na inicialização (idempotente)
- Usam `autoAck=false` — acknowledge manual
- `BasicAck` apenas após processamento bem-sucedido
- `BasicNack(requeue=false)` em falha — mensagem vai para DLQ
- Reconectam com backoff exponencial em caso de queda do broker

---

## 7. Padrão Outbox

### Por que Outbox?

Garante que um evento de domínio seja publicado **somente se** a transação do banco de dados for confirmada. Elimina o risco de publicar evento sem persistir a entidade (ou vice-versa).

### Implementação nos Serviços .NET (cadastro-api, identificacao-api)

```
Command Handler
  │
  ├── Cria entidade de domínio
  ├── Escreve OutboxEvent na mesma transação (OutboxEventWriter)
  └── SaveChangesAsync()  ←──── única transação, atomic
           │
           │  (background worker, poll a cada OUTBOX_POLL_INTERVAL_MS = 5s)
           ▼
  OutboxPublisherWorker
  ├── SELECT ... WHERE published_at IS NULL AND attempts < 10 LIMIT 100
  ├── Para cada evento:
  │   ├── Constrói CloudEvent
  │   ├── Publica no RabbitMQ via exchange/routing_key
  │   ├── Marca published_at = now()  (sucesso)
  │   └── Incrementa attempts  (falha)
  └── SaveChangesAsync()
```

**Tabela `outbox_events` (.NET):**

```sql
CREATE TABLE {schema}.outbox_events (
  id            UUID        PRIMARY KEY,
  type          VARCHAR     NOT NULL,   -- ex: "cadastro.obra.liberada"
  subject       VARCHAR     NOT NULL,   -- ex: "obra/12345"
  payload       TEXT        NOT NULL,   -- JSON
  routing_key   VARCHAR     NOT NULL,
  created_at    TIMESTAMP   NOT NULL,
  published_at  TIMESTAMP,              -- NULL = pendente
  attempts      INT         NOT NULL DEFAULT 0
);
```

**Tabela `audit_outbox_events` (todos os serviços):**

```sql
CREATE TABLE {schema}.audit_outbox_events (
  id            UUID        PRIMARY KEY,
  aggregate_id  VARCHAR     NOT NULL,
  event_type    VARCHAR     NOT NULL,
  payload       JSONB       NOT NULL,
  routing_key   VARCHAR     NOT NULL,
  created_at    TIMESTAMP   NOT NULL,
  published_at  TIMESTAMP,
  attempts      INT         NOT NULL DEFAULT 0
);
```

### Implementação nos Serviços Java (arrecadacao-api, distribuicao-api, ecad-authz)

Mesmo padrão com anotação `@Scheduled(fixedDelay=1000)` no poller e JDBC direto (sem EF Core). Para o ecad-authz, o retry usa backoff escalonado: `[1s, 5s, 30s, 2m, 10m]`, máximo 5 tentativas.

### Garantias do Padrão

| Garantia | Como é assegurada |
|----------|-------------------|
| **Atomicidade** | Evento + entidade na mesma transação DB |
| **Durabilidade** | Evento persiste antes de qualquer tentativa de publicação |
| **Pelo menos uma entrega** | Poller retenta até `max_attempts` |
| **Ordem FIFO** | Eventos ordenados por `created_at` no SELECT |
| **Exactly-once consumption** | Consumidores fazem ack manual após processamento |

---

## 8. Dependências de Banco de Dados

### PostgreSQL mcad (compartilhado)

**Host:** `mcad-postgres` (Docker) / `localhost:5432`
**Database:** `mcad`
**Admin:** `gestauto` / `gestauto123`
**Migrations:** EF Core (serviços .NET), Flyway (serviços Java)

| Serviço | Schema | Usuário DB | Tabelas Principais |
|---------|--------|-----------|-------------------|
| cadastro-api | `cadastro` | `cadastro_svc` | obras, fonogramas, titulares, titularidades, participacoes, associacoes, historico_bloqueio, outbox_events, audit_outbox_events |
| identificacao-api | `identificacao` | `identificacao_svc` | captacoes, rubricas, execucoes, tipos_utilizacao, uploads, erros_upload, outbox_events, audit_outbox_events |
| arrecadacao-api | `arrecadacao` | `arrecadacao_svc` | rubricas, usuarios_musica, licencas, historico_status_licenca, verbas, uda_valor, pagamentos, usuarios_identidade, audit_outbox_events |
| distribuicao-api | `distribuicao` | `distribuicao_app` | processos, processo_calculos, distribuidores, lotes, historico_status_processo, demonstrativos, ajustes_estorno, audit_outbox_events |

### PostgreSQL ecad-authz (isolado)

**Host:** `ecad-authz-postgres` (Docker local) / instância própria em produção
**Port:** 55432 (dev, evita conflito)
**Database:** `ecad_authz`
**Migrations:** Flyway

| Tabela | Descrição |
|--------|-----------|
| `users` | Projeção local dos usuários do IdP |
| `roles` | Papéis RBAC |
| `permissions` | Catálogo de permissões (`dominio:area:recurso:acao`) |
| `user_roles` | Vínculo usuário-papel (com scope opcional) |
| `role_permissions` | Vínculo papel-permissão (N:N) |
| `revoked_sessions` | Sessões revogadas (verificação de bloqueio) |
| `outbox_events` | Outbox de eventos de auditoria do authz |

### Oracle ecad-auditoria (isolado)

**Host:** instância Oracle dedicada
**Port:** 1521
**PDB:** `FREEPDB1`
**Usuário:** `AUDIT_APP`

| Tabela | Descrição |
|--------|-----------|
| `audit_event` | Log de eventos (append-only, particionado mensalmente por `occurred_at_utc`) |
| `audit_event_dedup` | Deduplicação por `event_id` (UUID) |
| `audit_event_field` | Campos alterados (desnormalizado para queries de timeline) |
| `audit_report_job` | Jobs de geração de PDF (PENDING → RUNNING → DONE/FAILED) |
| `audit_report_file` | BLOB PDF + hash SHA-256 |
| `audit_outbox` | Outbox do lado produtor (criada pelo SDK, não pelo serviço central) |

---

## 9. Dependências de Infraestrutura

### Redis (ecad-authz)

**Uso:** cache de contexto de autorização e lista de sessões revogadas

| Item | Detalhe |
|------|---------|
| Host | `ecad-authz-redis` (Docker) / instância própria |
| Port | 6379 (dev) / 56379 (dev local isolado) |
| TTL máximo | 300 segundos (contexto de autorização) |
| Conteúdo | Contexto de autorização do usuário, decisões cacheadas, sessões revogadas |
| Fallback | Se Redis indisponível, consulta vai direto ao PostgreSQL (latência maior, sem queda) |

### MinIO / Cloudflare R2 (object storage)

**Uso:** armazenamento de arquivos CSV de uploads da identificacao-api

| Ambiente | Serviço | Endpoint | Credenciais |
|----------|---------|----------|------------|
| Dev | MinIO | `http://localhost:9000` | `mcadadmin` / `mcadadmin123` |
| Produção | Cloudflare R2 | `https://{accountId}.r2.cloudflarestorage.com` | `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` |

Configuração no `identificacao-api/1-Services/Identificacao.API/Program.cs`.

### Logto / Keycloak (Provedor de Identidade — IdP)

**Uso:** emissão de tokens OIDC/JWT; autenticação do usuário

| Ambiente | IdP | URL Issuer | Client Type |
|----------|-----|-----------|-------------|
| Dev | Keycloak 24 | `http://localhost:8080/realms/mcad` | Confidential / Public |
| Produção | Logto Cloud | `https://9lcinu.logto.app/oidc` | Public (PKCE) |

**Claims JWT relevantes:**

| Claim | Descrição | Usado por |
|-------|-----------|----------|
| `sub` | Identificador único do usuário | todos os serviços |
| `email` | E-mail do usuário | BFF, authz |
| `name` | Nome do usuário | BFF |
| `session_id` (ou `sid`) | ID da sessão (para revogação) | ecad-authz |
| `admin_area` | Área administrativa do usuário | ecad-authz |
| `association_id` | ID da associação (para escopo) | ecad-authz |
| `user_type` | Tipo do usuário (ECAD_INTERNAL, etc.) | ecad-authz |
| `roles` | Papéis (formato Keycloak) | authz-spring-boot-starter |

**Algoritmo de assinatura:** ES384

### OpenAI (ai-orchestrator)

**Uso:** LLM para o Copiloto Operacional

| Variável | Descrição |
|----------|-----------|
| `OPENAI_API_KEY` | Chave de API |
| `OPENAI_MODEL` | Modelo (padrão: `gpt-4.1-mini`) |
| `AI_TOOL_TIMEOUT_MS` | Timeout de ferramentas (10000ms) |
| `AI_MAX_MESSAGE_CHARS` | Limite de chars por mensagem (4000) |

### ISWC Lookup Service (cadastro-api)

**Uso:** validação e geração de código ISWC para obras musicais

| Parâmetro | Valor |
|-----------|-------|
| URL | `https://iswc.tasso.dev.br/` (variável `ISWC_BASE_URL`) |
| Timeout | 10 segundos |
| Retry | 2 tentativas |

---

## 10. Serviços Externos — ecad-authz

### O que é

O **ecad-authz** é o PDP (Policy Decision Point) centralizado para o ecossistema ECAD. Gerencia papéis, permissões, vínculos usuário-papel e toma decisões de autorização. Todos os microserviços e o BFF consultam o ecad-authz para verificar permissões.

**Repositório:** `github.com/tassosgomes/ecad-authz`
**URL produção:** `https://mcad-authz.tasso.dev.br`
**URL dev:** `http://localhost:8085`

### Como os Serviços Consultam o ecad-authz

**Serviços .NET** usam o SDK `Ecad.Authz.AspNetCore`:

```csharp
// Registrado via AddEcadAuthz() no Program.cs
// Internamente chama: POST /v1/authz/decisions
POST https://mcad-authz.tasso.dev.br/v1/authz/decisions
Authorization: Bearer <service-jwt>
Content-Type: application/json

{
  "subjectId": "user-sub-from-jwt",
  "permission": "cadastro:default:obra:editar",
  "scope": null
}

// Resposta
{
  "allowed": true,
  "reason": "PERMISSION_GRANTED",
  "authzVersion": "42"
}
```

**Serviços Java** usam o starter `authz-spring-boot-starter` com anotação `@RequiresPermission`.

**BFF** consome diretamente via HTTP para o endpoint `/v1/me/authorization-context` para montar o contexto do usuário logado.

### Configuração do SDK nos Serviços

| Parâmetro | Variável de Ambiente | Padrão |
|-----------|---------------------|--------|
| URL base | `AUTHZ_BASE_URL` | `http://localhost:8085` |
| Timeout de decisão | `AUTHZ_DECISION_TIMEOUT_MS` | 500ms |
| Cache local TTL | — | 60s |
| Cache remoto TTL | — | 300s |
| Timeout BFF | `AUTHZ_TIMEOUT_MS` | 3000ms |

### Dependências do ecad-authz

| Dependência | Finalidade |
|-------------|-----------|
| PostgreSQL (próprio) | Armazenamento de usuários, papéis, permissões, vínculos |
| Redis | Cache de contexto/decisões (fallback para PG se indisponível) |
| RabbitMQ | Publicação de eventos de auditoria + consumo de eventos de identidade |
| IdP (OIDC) | Validação de JWT, sincronização de usuários |
| ecad-auditoria | Destino dos eventos de RBAC publicados via Outbox |

### Modelo RBAC

```
Permissão: dominio:area:recurso:acao
  Exemplo: distribuicao:cadastro:obra:editar

Papel: dominio.area.nomepapel
  Exemplo: distribuicao.cadastro.operador
  Composto por: N permissões

Usuário:
  → N papéis (com ou sem scope)
  → Scope: tipo (ex: ASSOCIATION) + ID (ex: UUID da associação)

Admin Area (adminArea do usuário):
  - NULL  → não é admin
  - GLOBAL → pode gerenciar todos os domínios
  - <dominio> → pode gerenciar apenas seu domínio
```

---

## 11. Serviços Externos — ecad-auditoria

### O que é

O **ecad-auditoria** é o repositório central de trilha de auditoria para o ecossistema ECAD. Armazena três famílias de eventos: `SCREEN_ACCESS` (qual tela foi acessada), `USER_ACTION` (ação executada pelo usuário) e `DATA_CHANGE` (alteração de dado com before/after).

**Repositório:** `github.com/tassosgomes/ecad-auditoria`
**URL produção:** `https://api-audit.tasso.dev.br`
**Port dev:** 8080 (ou 5003 no Swarm)

### Como os Serviços Publicam Eventos

**Modo padrão (OUTBOX_RABBITMQ):** os serviços produtores escrevem na tabela `audit_outbox` local (na mesma transação da operação de negócio) e um poller publica no RabbitMQ:

```
Serviço (cadastro/identificacao/arrecadacao/distribuicao/authz)
  │
  ├── SDK: AuditClient.record(auditEvent)
  │   ├── Redacta campos sensíveis (AuditRedactor)
  │   └── Persiste em audit_outbox na mesma transação
  │
  └── Relay (poll 5s, batch 50):
      └── Publica em audit.events.exchange.v1 / audit.event.v1
               │
               ▼
      ecad-auditoria (consumer RabbitMQ)
      ├── Deduplica por event_id
      ├── Persiste em audit_event (Oracle, particionado)
      └── Popula audit_event_field (para queries de timeline)
```

**Modo alternativo (DIRECT_HTTP):** POST direto para `/api/v1/audit/events` (sem durabilidade, apenas para testes).

### Estrutura do Evento de Auditoria

```json
{
  "eventId": "uuid",
  "eventType": "DATA_CHANGE",
  "occurredAt": "2026-06-13T14:30:00Z",
  "actorId": "user-sub",
  "actorName": "João da Silva",
  "actorEmail": "joao@ecad.org.br",
  "correlationId": "uuid-correlacao",
  "entityType": "obra",
  "entityId": "obra-uuid",
  "screenId": "tela-obras",
  "serviceName": "cadastro-api",
  "changes": [
    {
      "field": "titulo",
      "before": "Noturno",
      "after": "Noturno em Dó Menor"
    }
  ]
}
```

**Redação automática de campos sensíveis** (password, senha, token, secret, privateKey, authorization, cookie) → substituídos por `[REDACTED]`.

### Dependências do ecad-auditoria

| Dependência | Finalidade |
|-------------|-----------|
| Oracle 23c | Armazenamento append-only de eventos (particionado por mês) |
| RabbitMQ | Consumo de eventos via `audit.events.ingest.v1` |
| IdP (OIDC) | Validação de JWT (quando `AUTH_ENABLED=true`) |

### SDKs Disponíveis

| Linguagem | Pacote | Modo de entrega |
|-----------|--------|----------------|
| Java/Spring Boot | `audit-sdk-spring-boot-starter` | OUTBOX_RABBITMQ (padrão) |
| .NET 8 | `Ecad.Audit.AspNetCore` | OUTBOX_RABBITMQ (padrão) |

---

## 12. Fluxo de Autorização (PDP)

```
Browser
  │  POST /api/cadastro/v1/obras
  │  Authorization: Bearer <jwt>
  ▼
BFF (:5200)
  │  Extrai sub do JWT
  │  (se /api/me) consulta ecad-authz GET /v1/me/authorization-context
  │                └── cache Redis TTL 60s no BFF
  │  Proxy para cadastro-api com Bearer token original
  ▼
cadastro-api (:5001)  [com SDK Ecad.Authz.AspNetCore]
  │  Middleware de autorização:
  │    1. Extrai sub do JWT
  │    2. Verifica cache local (TTL 60s)
  │    3. Se miss: POST /v1/authz/decisions → ecad-authz
  │    4. ecad-authz consulta:
  │       ├── Redis (cache TTL 300s)
  │       └── PostgreSQL (fallback)
  │    5. Se allowed=true: continua
  │    6. Se allowed=false: retorna 403
  ▼
Handler da operação
  └── Executa lógica de negócio
```

**Versão do contexto de autorização (`X-Authz-Version`):**
- Cabeçalho retornado em respostas do BFF
- Quando muda, invalida o cache do browser
- Garante que mudanças de permissão sejam propagadas sem esperar TTL

---

## 13. Fluxo de Auditoria

```
cadastro-api (após SaveChangesAsync)
  │  AuditClient.record(DATA_CHANGE, entityType="obra", entityId=..., changes=[...])
  │  └── Persiste em cadastro.audit_outbox_events (mesma transação)
  │
  ├── [5 segundos depois — AuditRelayWorker]
  │   └── Publica em audit.events.exchange.v1 / audit.event.v1
  │
  ▼
ecad-auditoria (consumer RabbitMQ)
  ├── Desserializa AuditEvent
  ├── Verifica deduplicação em audit_event_dedup (Oracle)
  ├── Persiste em audit_event (Oracle, partição do mês)
  ├── Popula audit_event_field (campos alterados)
  └── BasicAck

BFF (paralelamente à resposta de negócio)
  ├── [após resposta do upstream] publica SCREEN_ACCESS
  │   └── POST direto para ecad-auditoria /api/v1/audit/events
  │       ou via outbox (conforme configuração)
  └── Retorna resposta ao browser

Frontend (consulta histórico)
  │  GET /api/auditoria/v1/entities/obra/{id}/timeline
  ▼
BFF → ecad-auditoria
  │  GET /api/v1/audit/entities/obra/{id}/timeline?limit=50
  └── Retorna lista de eventos ordenada por tempo
```

---

## 14. Topologia Docker Compose

Arquivo principal: `docker-compose.dev.yml`

### Serviços de Infraestrutura

```yaml
mcad-postgres:
  image: postgres:16-alpine
  ports: ["5432:5432"]
  environment:
    POSTGRES_USER: gestauto
    POSTGRES_PASSWORD: gestauto123
    POSTGRES_DB: mcad
  volumes:
    - mcad_pg_data:/var/lib/postgresql/data
    - ./scripts/postgres-init:/docker-entrypoint-initdb.d:ro

mcad-rabbitmq:
  image: rabbitmq:3.13-management-alpine
  ports: ["5672:5672", "15672:15672"]
  environment:
    RABBITMQ_DEFAULT_USER: mcad
    RABBITMQ_DEFAULT_PASS: mcad
    RABBITMQ_DEFAULT_VHOST: mcad
  volumes:
    - mcad_rmq_data:/var/lib/rabbitmq

mcad-minio:
  image: minio/minio:latest
  ports: ["9000:9000", "9001:9001"]
  environment:
    MINIO_ROOT_USER: mcadadmin
    MINIO_ROOT_PASSWORD: mcadadmin123
  volumes:
    - mcad_minio_data:/data

# Serviços opcionais (profile: authz)
ecad-authz-postgres:
  image: postgres:16-alpine
  ports: ["55432:5432"]

ecad-authz-redis:
  image: redis:7-alpine
  ports: ["56379:6379"]

ecad-authz:
  build: local
  ports: ["8085:8080"]
  depends_on: [ecad-authz-postgres, ecad-authz-redis]
```

### Serviços da Aplicação (no Docker Compose)

```yaml
distribuicao-api:
  ports: ["5004:5004"]
  depends_on: [mcad-postgres, mcad-rabbitmq]

bff:
  ports: ["5200:5200"]
  depends_on: [ai-orchestrator, distribuicao-api]

ai-orchestrator:
  ports: ["5300:5300"]
  depends_on: [distribuicao-api]
```

### Serviços executados localmente (sem Docker)

| Serviço | Comando | Porta |
|---------|---------|-------|
| cadastro-api | `dotnet run --launch-profile http` | 5001 |
| identificacao-api | `dotnet run --launch-profile http` | 5100 |
| arrecadacao-api | `mvn spring-boot:run -Pdev` | 5003 |
| frontend | `npm run dev` | 5173 |

### Volumes

| Volume | Conteúdo |
|--------|---------|
| `mcad_pg_data` | Dados PostgreSQL (mcad) |
| `mcad_rmq_data` | Dados RabbitMQ |
| `mcad_minio_data` | Arquivos MinIO |
| `mcad_authz_pg_data` | Dados PostgreSQL (ecad-authz) |
| `mcad_authz_redis_data` | Dados Redis (ecad-authz) |

---

## 15. Matriz de Dependências

### Dependências síncronas (HTTP REST)

| De → Para | Protocolo | Finalidade |
|-----------|----------|-----------|
| Frontend → BFF | HTTP + JWT | Todas as requisições de dados e ações |
| BFF → cadastro-api | HTTP proxy + JWT | CRUD de obras, titulares, fonogramas |
| BFF → identificacao-api | HTTP proxy + JWT | Captações, uploads, execuções |
| BFF → arrecadacao-api | HTTP proxy + JWT | Rubricas, pagamentos, licenças |
| BFF → distribuicao-api | HTTP proxy + JWT | Processos de distribuição |
| BFF → ecad-authz | HTTP + JWT | Contexto de autorização do usuário (`/v1/me/authorization-context`) |
| BFF → ecad-auditoria | HTTP + JWT | Screen access events (assíncrono pós-resposta) |
| BFF → ai-orchestrator | HTTP proxy + JWT | Copiloto IA |
| cadastro-api → ecad-authz | HTTP SDK + JWT | Decisões de permissão (PDP) |
| identificacao-api → ecad-authz | HTTP SDK + JWT | Decisões de permissão (PDP) |
| arrecadacao-api → ecad-authz | HTTP SDK + JWT | Decisões de permissão (PDP) |
| distribuicao-api → ecad-authz | HTTP SDK + JWT | Decisões de permissão (PDP) |
| cadastro-api → ISWC Service | HTTP REST | Validação/geração de código ISWC |
| identificacao-api → MinIO/R2 | S3 API | Upload/download de CSV |
| ai-orchestrator → OpenAI | HTTPS | Chamadas de LLM |
| ai-orchestrator → cadastro-api | HTTP REST | Ferramentas do Copiloto |
| ai-orchestrator → distribuicao-api | HTTP REST | Ferramentas do Copiloto |

### Dependências assíncronas (RabbitMQ)

| Publisher | Exchange | Routing Key | Subscriber |
|-----------|---------|------------|-----------|
| cadastro-api | `cadastro.events` | `cadastro.*` | (futuro consumidor) |
| arrecadacao-api | `arrecadacao.events` | `arrecadacao.rubrica.*` | distribuicao-api |
| arrecadacao-api | `arrecadacao.events` | `arrecadacao.pagamento.estornado` | distribuicao-api |
| distribuicao-api | `distribuicao.events` | `distribuicao.rol.processado` | identificacao-api |
| identity-sync-api | `identity.events` | `identity.user.*` | cadastro-api, identificacao-api, arrecadacao-api, ecad-authz |
| cadastro-api (SDK) | `audit.events.exchange.v1` | `audit.event.v1` | ecad-auditoria |
| identificacao-api (SDK) | `audit.events.exchange.v1` | `audit.event.v1` | ecad-auditoria |
| arrecadacao-api (SDK) | `audit.events.exchange.v1` | `audit.event.v1` | ecad-auditoria |
| distribuicao-api (SDK) | `audit.events.exchange.v1` | `audit.event.v1` | ecad-auditoria |
| ecad-authz | `audit.events.exchange.v1` | `audit.event.v1` | ecad-auditoria |

### Dependências de banco de dados

| Serviço | DB | Schema/DB | Acesso |
|---------|----|-----------|----|
| cadastro-api | PostgreSQL `mcad` | schema `cadastro` | leitura/escrita |
| identificacao-api | PostgreSQL `mcad` | schema `identificacao` | leitura/escrita |
| arrecadacao-api | PostgreSQL `mcad` | schema `arrecadacao` | leitura/escrita |
| distribuicao-api | PostgreSQL `mcad` | schema `distribuicao` | leitura/escrita |
| ecad-authz | PostgreSQL próprio | database `ecad_authz` | leitura/escrita |
| ecad-authz | Redis | — | cache |
| ecad-auditoria | Oracle | schema `AUDIT_APP` | leitura/escrita |

### Variáveis de Ambiente Chave por Serviço

**BFF (`services/bff`):**
```env
BFF_HOST=0.0.0.0
BFF_PORT=5200
CADASTRO_API_BASE_URL=http://localhost:5001
IDENTIFICACAO_API_BASE_URL=http://localhost:5100
ARRECADACAO_API_BASE_URL=http://localhost:5003
DISTRIBUICAO_API_BASE_URL=http://localhost:5004
AUTHZ_BASE_URL=https://mcad-authz.tasso.dev.br
AUTHZ_TIMEOUT_MS=3000
AUDITORIA_API_BASE_URL=https://api-audit.tasso.dev.br/api/v1
AUDIT_TIMEOUT_MS=5000
ME_CACHE_TTL_SECONDS=60
OIDC_AUTHORITY=https://9lcinu.logto.app/oidc
```

**Serviços .NET (cadastro, identificacao):**
```env
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=mcad;...
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=mcad
RABBITMQ_PASS=mcad
RABBITMQ_VHOST=mcad
AUTHZ_BASE_URL=https://mcad-authz.tasso.dev.br
AUTHZ_DECISION_TIMEOUT_MS=500
AUTH_ENABLED=true
OIDC_AUTHORITY=https://9lcinu.logto.app/oidc
OUTBOX_POLL_INTERVAL_MS=5000
```

**Serviços Java (arrecadacao, distribuicao):**
```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/mcad
SPRING_RABBITMQ_HOST=localhost
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=mcad
SPRING_RABBITMQ_PASSWORD=mcad
SPRING_RABBITMQ_VIRTUAL_HOST=mcad
AUTHZ_BASE_URL=https://mcad-authz.tasso.dev.br
AUTH_ENABLED=true
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI=https://9lcinu.logto.app/oidc
```

---

*Última atualização: 2026-06-13*
*Gerado a partir da análise dos repositórios: mcad, ecad-authz, ecad-auditoria*
