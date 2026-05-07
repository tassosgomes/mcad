# API Contract — F01: Seed de Rubricas

> **Contrato gerado a partir do PRD:** `tasks/arrecadacao/prd-seed-rubricas/prd.md`
> **Spec OpenAPI:** `tasks/arrecadacao/prd-seed-rubricas/api-contract.yaml`
> **Data:** 2026-04-04

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/rubricas` | Listar todas as rubricas | JWT Bearer | `200` / `401` |
| `GET` | `/api/v1/rubricas/{sigla}` | Buscar rubrica por sigla | JWT Bearer | `200` / `401` / `404` |
| `POST/PUT/PATCH/DELETE` | `/api/v1/rubricas` | Bloqueado (read-only) | — | `405` |
| `POST/PUT/PATCH/DELETE` | `/api/v1/rubricas/{sigla}` | Bloqueado (read-only) | — | `405` |

---

## Endpoints Detalhados

### GET /api/v1/rubricas

**Propósito:** Retorna a lista completa das 7 rubricas de utilização musical do ECAD.

**Quem consome:**
- Frontend — tela de listagem read-only de rubricas
- Frontend — dropdown de seleção no cadastro de licenças (F03, futuro)

**Autenticação:** JWT Bearer (ambos os perfis: Analista e Consultor de Arrecadação)

**Paginação:** Nenhuma (apenas 7 registros fixos)

**Request:**
```http
GET /api/v1/rubricas HTTP/1.1
Host: localhost:5003
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
- Frontend — dropdown/select no cadastro de licenças (F03)
- Uso interno do domínio

**Autenticação:** JWT Bearer (ambos os perfis)

**Request:**
```http
GET /api/v1/rubricas/TV_ABERTA HTTP/1.1
Host: localhost:5003
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

**Propósito:** Bloquear operações de escrita — rubricas são dados imutáveis.

**Response (405 Method Not Allowed):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.5",
  "title": "Method Not Allowed",
  "status": 405,
  "detail": "Rubricas são dados de referência e não podem ser modificados",
  "instance": "/api/v1/rubricas"
}
```

---

## Schema: RubricaResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `string (uuid)` | Sim | Identificador único da rubrica |
| `sigla` | `string (max 20)` | Sim | Sigla única da rubrica (identificador natural) |
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
| `404` | Resource Not Found | Sigla não corresponde a nenhuma rubrica |
| `405` | Method Not Allowed | Tentativa de POST, PUT, PATCH ou DELETE em qualquer endpoint |
| `500` | Internal Server Error | Falha inesperada no servidor (ex: banco indisponível) |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| JWT Bearer via Keycloak | Padrão do projeto — Authorization Code + PKCE, aplicação consistente com Cadastro |
| Roles: analista-arrecadacao, consultor-arrecadacao | Ambos os perfis têm acesso GET em rubricas (read-only) |
| Busca por sigla (não por ID) | Sigla é o identificador natural da rubrica — mais intuitivo para consumidores |
| Sem paginação | Apenas 7 registros fixos — retorna array direto |
| Array direto (sem wrapper) | Não há metadados de paginação; lista sempre completa |
| ProblemDetails (RFC 7807) | Padrão adotado no projeto para erros |
| 405 explícito em verbos de escrita | RF-04 e RF-12 do PRD — dados são imutáveis |
| camelCase nos campos JSON | Convenção padrão do projeto |
| Porta 5003 | Arrecadação API — isolada do Cadastro (5001) e Identificação |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server imediato: `npx @stoplight/prism-cli mock api-contract.yaml`*
