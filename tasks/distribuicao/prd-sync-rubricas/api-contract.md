# API Contract — F01: Sincronização de Rubricas (Distribuição)

> **Contrato gerado a partir do PRD:** `tasks/distribuicao/prd-sync-rubricas/prd.md`
> **Spec OpenAPI:** `tasks/distribuicao/prd-sync-rubricas/api-contract.yaml`
> **Data:** 2026-04-08

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/rubricas` | Listar rubricas sincronizadas | JWT Bearer | `200` / `401` |
| `GET` | `/api/v1/rubricas/{sigla}` | Buscar rubrica por sigla | JWT Bearer | `200` / `401` / `404` |
| `POST/PUT/PATCH/DELETE` | `/api/v1/rubricas` | Bloqueado (read-only) | — | `405` |
| `POST/PUT/PATCH/DELETE` | `/api/v1/rubricas/{sigla}` | Bloqueado (read-only) | — | `405` |

---

## Endpoints Detalhados

### GET /api/v1/rubricas

**Propósito:** Retorna a lista de rubricas sincronizadas via eventos da Arrecadação.

**Quem consome:**
- Frontend — tela de listagem read-only de rubricas (Distribuição)
- Frontend — dropdown de seleção na criação de processos de distribuição (F02, futuro)

**Autenticação:** JWT Bearer (ambos os perfis: Analista e Consultor de Distribuição)

**Paginação:** Nenhuma (máximo 7 registros sincronizados)

**Request:**
```http
GET /api/v1/rubricas HTTP/1.1
Host: localhost:5004
Accept: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sigla": "RADIO",
    "nome": "Rádio AM/FM",
    "exigeClassificacao": false
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "sigla": "TV_ABERTA",
    "nome": "TV Aberta",
    "exigeClassificacao": true
  },
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "sigla": "TV_FECHADA",
    "nome": "TV Fechada",
    "exigeClassificacao": true
  },
  {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "sigla": "CINEMA",
    "nome": "Cinema",
    "exigeClassificacao": true
  },
  {
    "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
    "sigla": "VOD",
    "nome": "Streaming Vídeo (VOD)",
    "exigeClassificacao": true
  },
  {
    "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
    "sigla": "STREAMING_AUDIO",
    "nome": "Streaming Áudio",
    "exigeClassificacao": false
  },
  {
    "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
    "sigla": "SHOW",
    "nome": "Show",
    "exigeClassificacao": false
  }
]
```

**Response (200 OK — nenhuma rubrica sincronizada):**
```json
[]
```

**Response (401 Unauthorized):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Token de autenticação ausente ou inválido",
  "instance": "/api/v1/rubricas"
}
```

---

### GET /api/v1/rubricas/{sigla}

**Propósito:** Retorna os dados de uma rubrica específica pela sua sigla.

**Quem consome:**
- Frontend — dropdown/select na criação de processo de distribuição (F02)
- Uso interno do domínio (F03 — Cálculo de Créditos)

**Autenticação:** JWT Bearer (ambos os perfis)

**Request:**
```http
GET /api/v1/rubricas/TV_ABERTA HTTP/1.1
Host: localhost:5004
Accept: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "sigla": "TV_ABERTA",
  "nome": "TV Aberta",
  "exigeClassificacao": true
}
```

**Response (404 Not Found):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Rubrica com sigla 'INEXISTENTE' não foi encontrada",
  "instance": "/api/v1/rubricas/INEXISTENTE"
}
```

---

### POST/PUT/PATCH/DELETE (qualquer path)

**Propósito:** Bloquear operações de escrita — rubricas são dados sincronizados da Arrecadação.

**Response (405 Method Not Allowed):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.5",
  "title": "Method Not Allowed",
  "status": 405,
  "detail": "Rubricas são dados sincronizados da Arrecadação e não podem ser modificados localmente",
  "instance": "/api/v1/rubricas"
}
```

---

## Schema: RubricaResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `string (uuid)` | Sim | Identificador único da rubrica (gerado localmente na Distribuição) |
| `sigla` | `string (max 20)` | Sim | Sigla única da rubrica (identificador natural, chave de sincronização) |
| `nome` | `string (max 100)` | Sim | Nome completo da rubrica |
| `exigeClassificacao` | `boolean` | Sim | Se execuções desta rubrica exigem classificação por tipo de utilização (TA, TE, PE, BK). `true` para audiovisuais, `false` para demais |

## Schema: ProblemDetails (Erros)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | `string (uri)` | Sim | URI de referência do tipo de erro (RFC 7231) |
| `title` | `string` | Sim | Título curto do erro |
| `status` | `integer` | Sim | HTTP status code |
| `detail` | `string` | Não | Descrição detalhada do erro |
| `instance` | `string` | Não | Path da requisição que gerou o erro |
| `traceId` | `string` | Não | ID de rastreamento (presente em erros 5xx) |

---

## Códigos de Erro

| Status | Código | Quando |
|--------|--------|--------|
| `401` | Unauthorized | Token JWT ausente, expirado ou inválido |
| `404` | Resource Not Found | Sigla não corresponde a nenhuma rubrica sincronizada |
| `405` | Method Not Allowed | Tentativa de POST, PUT, PATCH ou DELETE em qualquer endpoint |
| `500` | Internal Server Error | Falha inesperada no servidor (ex: banco indisponível) |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| JWT Bearer via Keycloak | Padrão do projeto — Authorization Code + PKCE, consistente com os demais domínios |
| Roles: analista-distribuicao, consultor-distribuicao | Ambos os perfis têm acesso GET em rubricas (read-only) |
| Busca por sigla (não por ID) | Sigla é o identificador natural — consistente com contrato da Arrecadação |
| Sem paginação | Máximo 7 registros — retorna array direto |
| Array direto (sem wrapper) | Não há metadados de paginação; lista sempre completa |
| Array vazio quando sem dados | Sem fallback/seed — depende 100% de eventos da Arrecadação |
| ProblemDetails (RFC 7807) | Padrão adotado no projeto para erros |
| 405 explícito em verbos de escrita | RF-08 do PRD — dados são sincronizados, não editáveis localmente |
| camelCase nos campos JSON | Convenção padrão do projeto |
| Porta 5004 | Distribuição API — isolada dos demais serviços (Cadastro 5001, Identificação 5100, Arrecadação 5003) |
| Schema idêntico ao da Arrecadação | Mesma estrutura de RubricaResponse para consistência cross-domain |
| ID gerado localmente (UUID) | O ID é da cópia local, não do registro original da Arrecadação — a sigla é a chave de sincronização |

---

## Diferenças em Relação ao Contrato da Arrecadação

| Aspecto | Arrecadação (fonte) | Distribuição (cópia) |
|---------|---------------------|----------------------|
| Porta | 5003 | 5004 |
| Origem dos dados | Seed via Flyway migration | Consumo de eventos RabbitMQ |
| Roles | analista-arrecadacao, consultor-arrecadacao | analista-distribuicao, consultor-distribuicao |
| Listagem vazia | Impossível (seed garante 7 registros) | Possível (se eventos não foram consumidos) |
| ID do registro | Gerado no seed | Gerado no consumo do evento |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server imediato: `npx @stoplight/prism-cli mock api-contract.yaml`*
