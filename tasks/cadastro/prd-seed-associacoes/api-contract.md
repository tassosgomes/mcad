# API Contract — F01: Seed de Associações

> **Contrato gerado a partir do PRD:** `tasks/prd-seed-associacoes/prd.md`
> **Spec OpenAPI:** `tasks/prd-seed-associacoes/api-contract.yaml`
> **Data:** 2026-03-29

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/associacoes` | Listar todas as associações | Nenhuma | `200` |
| `GET` | `/api/v1/associacoes/{id}` | Buscar associação por ID | Nenhuma | `200` / `404` |
| `POST/PUT/PATCH/DELETE` | `/api/v1/associacoes` | Bloqueado (read-only) | — | `405` |
| `POST/PUT/PATCH/DELETE` | `/api/v1/associacoes/{id}` | Bloqueado (read-only) | — | `405` |

---

## Endpoints Detalhados

### GET /api/v1/associacoes

**Propósito:** Retorna a lista completa das 7 associações de gestão coletiva do ECAD.

**Quem consome:**
- Frontend — tela de listagem read-only de associações
- Frontend — dropdown de seleção no cadastro de titulares (F02, futuro)

**Paginação:** Nenhuma (apenas 7 registros fixos)

**Request:**
```http
GET /api/v1/associacoes HTTP/1.1
Host: localhost:5001
Accept: application/json
```

**Response (200 OK):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sigla": "ABRAMUS",
    "nome": "Associação Brasileira de Música e Artes",
    "cnpj": "50.997.063/0001-32"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "sigla": "AMAR",
    "nome": "Associação de Músicos, Arranjadores e Regentes",
    "cnpj": "30.713.325/0001-82"
  },
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "sigla": "ASSIM",
    "nome": "Associação de Intérpretes e Músicos",
    "cnpj": "43.985.563/0001-99"
  },
  {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "sigla": "SBACEM",
    "nome": "Sociedade Brasileira de Autores, Compositores e Escritores de Música",
    "cnpj": "33.780.222/0001-23"
  },
  {
    "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
    "sigla": "SICAM",
    "nome": "Sociedade Independente de Compositores e Autores Musicais",
    "cnpj": "62.092.010/0001-51"
  },
  {
    "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
    "sigla": "SOCINPRO",
    "nome": "Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais",
    "cnpj": "33.748.146/0001-79"
  },
  {
    "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
    "sigla": "UBC",
    "nome": "União Brasileira de Compositores",
    "cnpj": "33.576.166/0001-00"
  }
]
```

---

### GET /api/v1/associacoes/{id}

**Propósito:** Retorna os dados de uma associação específica.

**Quem consome:**
- Frontend — detalhamento (se necessário)
- Outros serviços — resolução de referência por ID

**Request:**
```http
GET /api/v1/associacoes/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: localhost:5001
Accept: application/json
```

**Response (200 OK):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sigla": "ABRAMUS",
  "nome": "Associação Brasileira de Música e Artes",
  "cnpj": "50.997.063/0001-32"
}
```

**Response (404 Not Found):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Associação with ID '00000000-0000-0000-0000-000000000000' was not found",
  "instance": "/api/v1/associacoes/00000000-0000-0000-0000-000000000000"
}
```

---

### POST/PUT/PATCH/DELETE (qualquer path)

**Propósito:** Bloquear operações de escrita — associações são dados imutáveis.

**Response (405 Method Not Allowed):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.5",
  "title": "Method Not Allowed",
  "status": 405,
  "detail": "Associações são dados de referência e não podem ser modificados",
  "instance": "/api/v1/associacoes"
}
```

---

## Schema: AssociacaoResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `string (uuid)` | Sim | Identificador único da associação |
| `sigla` | `string (max 20)` | Sim | Sigla da associação (ex: ABRAMUS, UBC) |
| `nome` | `string (max 200)` | Sim | Nome completo da associação |
| `cnpj` | `string (18 chars)` | Sim | CNPJ no formato XX.XXX.XXX/XXXX-XX |

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
| `404` | Resource Not Found | ID não corresponde a nenhuma associação |
| `405` | Method Not Allowed | Tentativa de POST, PUT, PATCH ou DELETE em qualquer endpoint |
| `500` | Internal Server Error | Falha inesperada no servidor (ex: banco indisponível) |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| Sem autenticação | PoC sem auth entre serviços (Non-Goal do Vision Doc) |
| Sem paginação | Apenas 7 registros fixos — retorna array direto |
| Array direto (sem wrapper) | Não há metadados de paginação; lista sempre completa |
| ProblemDetails (RFC 7807) | Padrão adotado na Tech Spec para erros |
| 405 explícito em verbos de escrita | RF-04 e RF-10 do PRD — dados são imutáveis |
| UUIDs determinísticos | Garantem referência estável cross-service |
| camelCase nos campos JSON | Convenção padrão .NET System.Text.Json |
| CNPJ como string formatada | Preserva formato visual; validação via regex pattern |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server imediato: `npx @stoplight/prism-cli mock api-contract.yaml`*
