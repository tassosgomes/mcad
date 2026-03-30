# API Contract — F02: Gestão de Titulares

> **Contrato gerado a partir do PRD:** `tasks/prd-gestao-titulares/prd.md`
> **Spec OpenAPI:** `tasks/prd-gestao-titulares/api-contract.yaml`
> **Data:** 2026-03-30

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/titulares` | Listar com paginação, filtros e ordenação | JWT (futuro) | `200` |
| `POST` | `/api/v1/titulares` | Criar titular PF ou PJ | JWT (futuro) | `201` / `409` / `422` |
| `GET` | `/api/v1/titulares/{id}` | Buscar por ID | JWT (futuro) | `200` / `404` |
| `PUT` | `/api/v1/titulares/{id}` | Atualizar dados editáveis | JWT (futuro) | `200` / `404` / `422` |
| `DELETE` | `/api/v1/titulares/{id}` | Excluir (se sem vínculos) | JWT (futuro) | `204` / `404` / `409` |

---

## Endpoints Detalhados

### GET /api/v1/titulares

**Propósito:** Lista paginada de titulares com filtros e ordenação server-side.

**Query Parameters:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `page` | integer | 1 | Página atual |
| `size` | integer | 20 | Itens por página (max 100) |
| `sort` | string | `nome` | Campo de ordenação. Prefixo `-` para DESC. Campos: `nome`, `associacao`, `status` |
| `nome` | string | — | Filtro parcial, case-insensitive |
| `documento` | string | — | Filtro parcial por CPF/CNPJ (apenas alfanuméricos) |
| `associacaoId` | uuid | — | Filtro exato por associação |
| `status` | enum | — | ATIVO, FALECIDO, TRANSFERINDO |

**Response (200):**
```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "nome": "Djavan Caetano Viana",
      "tipo": "PF",
      "documento": "12345678909",
      "documentoFormatado": "123.456.789-09",
      "nacionalidade": "Brasileira",
      "caeIpi": "123456789",
      "associacao": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "sigla": "ABRAMUS",
        "nome": "Associação Brasileira de Música e Artes"
      },
      "status": "ATIVO",
      "criadoEm": "2026-03-30T14:30:00Z",
      "atualizadoEm": "2026-03-30T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

---

### POST /api/v1/titulares

**Propósito:** Criar um novo titular (PF ou PJ).

**Request:**
```json
{
  "nome": "Djavan Caetano Viana",
  "tipo": "PF",
  "documento": "12345678909",
  "nacionalidade": "Brasileira",
  "associacaoId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "caeIpi": "123456789"
}
```

**Response (201):** Retorna `TitularResponse` completo + header `Location`.

**Response (409 — Documento duplicado):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Conflict",
  "status": 409,
  "detail": "Já existe um titular cadastrado com este CPF: 123.456.789-09"
}
```

**Response (422 — CPF/CNPJ inválido):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "CPF inválido"
}
```

---

### GET /api/v1/titulares/{id}

**Response (200):** Retorna `TitularResponse` completo.

**Response (404):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Titular com ID 'f47ac10b-...' não foi encontrado"
}
```

---

### PUT /api/v1/titulares/{id}

**Propósito:** Atualizar dados editáveis. Tipo e documento são imutáveis.

**Request:**
```json
{
  "nome": "Djavan Caetano Viana",
  "nacionalidade": "Brasileira",
  "associacaoId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "ATIVO",
  "caeIpi": "123456789"
}
```

**Response (200):** Retorna `TitularResponse` atualizado.

---

### DELETE /api/v1/titulares/{id}

**Response (204):** Sem body — titular excluído.

**Response (409 — Titular com vínculos):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Conflict",
  "status": 409,
  "detail": "Titular não pode ser excluído pois possui vínculos com obras ou fonogramas"
}
```

---

## Schemas Principais

### TitularResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | ID único |
| `nome` | `string (max 200)` | Sim | Nome completo ou razão social |
| `tipo` | `enum (PF, PJ)` | Sim | Pessoa Física ou Jurídica |
| `documento` | `string (11-14)` | Sim | CPF/CNPJ sem formatação |
| `documentoFormatado` | `string` | Sim | CPF/CNPJ com formatação para exibição |
| `nacionalidade` | `string (max 100)` | Sim | Texto livre |
| `caeIpi` | `string (max 20)` | Não | Código internacional |
| `associacao` | `AssociacaoResumo` | Sim | Associação vinculada (id, sigla, nome) |
| `status` | `enum` | Sim | ATIVO, FALECIDO, TRANSFERINDO |
| `criadoEm` | `date-time` | Sim | ISO 8601 |
| `atualizadoEm` | `date-time` | Sim | ISO 8601 |

### CriarTitularRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | `string (1-200)` | Sim | Nome completo ou razão social |
| `tipo` | `enum (PF, PJ)` | Sim | PF exige CPF, PJ exige CNPJ |
| `documento` | `string (11-14)` | Sim | CPF ou CNPJ sem formatação |
| `nacionalidade` | `string (1-100)` | Sim | Texto livre |
| `associacaoId` | `uuid` | Sim | ID da associação |
| `caeIpi` | `string (max 20)` | Não | Código internacional |

### AtualizarTitularRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | `string (1-200)` | Sim | Nome |
| `nacionalidade` | `string (1-100)` | Sim | Nacionalidade |
| `associacaoId` | `uuid` | Sim | ID da associação |
| `status` | `enum` | Sim | ATIVO, FALECIDO, TRANSFERINDO |
| `caeIpi` | `string (max 20)` | Não | CAE/IPI |

> **Nota:** `tipo` e `documento` não são aceitos no update — imutáveis após criação.

---

## Códigos de Erro

| Status | Quando |
|--------|--------|
| `400` | Campos obrigatórios ausentes ou formato inválido |
| `404` | Titular com ID informado não existe |
| `409` | CPF/CNPJ duplicado (POST) ou titular com vínculos (DELETE) |
| `422` | CPF/CNPJ com dígitos verificadores inválidos |
| `500` | Erro inesperado do servidor |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| `documento` sem formatação no request/response | Uniformiza entrada; frontend formata na exibição |
| `documentoFormatado` no response | Facilita exibição no frontend sem lógica de formatação |
| `associacao` como objeto aninhado (não apenas ID) | Evita N+1 de requests no frontend para resolver siglas |
| PUT (não PATCH) para update | Todos os campos editáveis são enviados — simplifica validação |
| `sort` com prefixo `-` para DESC | Convenção simples, sem params extras (sortDirection) |
| `409` para documento duplicado e vínculos | Distingue de `422` (validação) — é um conflito de estado |
| JWT Bearer declarado mas não enforçado ainda | Auth retroativa conforme `docs/architecture/auth-plan.md` |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server: `npx @stoplight/prism-cli mock api-contract.yaml`*
