# API Contract — F04: Titularidades Autorais

> **Contrato gerado a partir do PRD:** `tasks/prd-titularidades-autorais/prd.md`
> **Spec OpenAPI:** `tasks/prd-titularidades-autorais/api-contract.yaml`
> **Data:** 2026-03-31

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/obras/{obraId}/titularidades` | Listar titularidades + soma | JWT (futuro) | `200` |
| `POST` | `/api/v1/obras/{obraId}/titularidades` | Adicionar titularidade | JWT (futuro) | `201` / `409` / `422` |
| `PUT` | `/api/v1/obras/{obraId}/titularidades/{id}` | Editar percentual | JWT (futuro) | `200` / `409` |
| `DELETE` | `/api/v1/obras/{obraId}/titularidades/{id}` | Remover titularidade | JWT (futuro) | `200` / `409` |
| `GET` | `/api/v1/titulares/busca?q=` | Autocomplete de titulares | JWT (futuro) | `200` |

---

## Endpoints Detalhados

### GET /api/v1/obras/{obraId}/titularidades

**Propósito:** Lista todas as titularidades da obra com soma atual.

**Response (200):**
```json
{
  "obraId": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "titularidades": [
    {
      "id": "aaa11111-1111-1111-1111-111111111111",
      "titular": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "nome": "Djavan Caetano Viana",
        "tipo": "PF",
        "documentoFormatado": "123.456.789-09"
      },
      "categoria": "AUTOR",
      "percentual": 60.0000
    },
    {
      "id": "bbb22222-2222-2222-2222-222222222222",
      "titular": {
        "id": "c83de1a2-45ff-4890-bcde-012345678901",
        "nome": "Editora Musical ABC Ltda",
        "tipo": "PJ",
        "documentoFormatado": "12.345.678/0001-90"
      },
      "categoria": "EDITOR",
      "percentual": 40.0000
    }
  ],
  "somaPercentual": 100.0000,
  "somaCompleta": true
}
```

---

### POST /api/v1/obras/{obraId}/titularidades

**Propósito:** Adicionar titular autoral à obra.

**Request:**
```json
{
  "titularId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "categoria": "AUTOR",
  "percentual": 60.0000
}
```

**Response (201):** `TitularidadesResponse` completo com soma atualizada.

**Response (409 — obra LIBERADA):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Depuração Necessária",
  "status": 409,
  "detail": "Alterar titulares de uma obra LIBERADA requer depuração",
  "code": "DEPURACAO_NECESSARIA"
}
```

**Response (422 — Editor PF):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "A categoria Editor exige titular Pessoa Jurídica"
}
```

---

### PUT /api/v1/obras/{obraId}/titularidades/{id}

**Propósito:** Editar percentual de titularidade. Categoria imutável.

**Request:**
```json
{ "percentual": 75.0000 }
```

**Response (200):** `TitularidadesResponse` com soma atualizada.

---

### DELETE /api/v1/obras/{obraId}/titularidades/{id}

**Propósito:** Remover titularidade. Soma pode ficar < 100%.

**Response (200):** `TitularidadesResponse` com soma atualizada (retorna body, não 204).

> **Decisão:** DELETE retorna 200 com body para que o frontend atualize a soma sem request adicional.

---

### GET /api/v1/titulares/busca?q=djavan

**Propósito:** Autocomplete para seleção de titular ao adicionar titularidade.

**Response (200):**
```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "nome": "Djavan Caetano Viana",
    "tipo": "PF",
    "documentoFormatado": "123.456.789-09",
    "associacaoSigla": "ABRAMUS"
  }
]
```

---

## Schemas Principais

### TitularidadesResponse

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `obraId` | `uuid` | ID da obra |
| `titularidades` | `TitularidadeItem[]` | Lista de vínculos |
| `somaPercentual` | `decimal (4 casas)` | Soma atual |
| `somaCompleta` | `boolean` | true se soma == 100.0000 |

### TitularidadeItem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `uuid` | ID do vínculo |
| `titular` | `TitularResumo` | Dados resumidos do titular |
| `categoria` | `enum (AUTOR, EDITOR)` | Categoria autoral |
| `percentual` | `decimal (4 casas)` | 0.0001 a 100.0000 |

### AdicionarTitularidadeRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `titularId` | `uuid` | Sim | ID do titular existente |
| `categoria` | `enum` | Sim | AUTOR ou EDITOR |
| `percentual` | `decimal` | Sim | 0.0001 a 100.0000 |

---

## Códigos de Erro

| Status | Code | Quando |
|--------|------|--------|
| `400` | — | Campos obrigatórios ausentes, percentual inválido |
| `404` | — | Obra ou titularidade não encontrada |
| `409` | `DEPURACAO_NECESSARIA` | Qualquer operação em obra LIBERADA |
| `409` | — | Titular + categoria duplicado na mesma obra |
| `422` | — | Editor com titular PF, titular não encontrado |
| `500` | — | Erro inesperado |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| Sub-recurso `/obras/{id}/titularidades` | Titularidade pertence à obra; semântica REST correta |
| DELETE retorna 200 com body (não 204) | Frontend precisa da soma atualizada sem request extra |
| Todas as mutations retornam TitularidadesResponse completo | Frontend atualiza tabela + soma em uma única operação |
| Autocomplete em `/titulares/busca` (não `/obras/{id}/titulares/busca`) | Reutilizável — mesma busca serve para F06 (Conexos) |
| 409 DEPURACAO_NECESSARIA para todas as operações em obra LIBERADA | Consistente com F03 — frontend já tem o fluxo de depuração |
| Categoria imutável no PUT | Simplifica lógica; remover + readicionar cobre o caso de mudança |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server: `npx @stoplight/prism-cli mock api-contract.yaml`*
