# API Contract — F05: Gestão de Fonogramas

> **Contrato gerado a partir do PRD:** `tasks/prd-gestao-fonogramas/prd.md`
> **Spec OpenAPI:** `tasks/prd-gestao-fonogramas/api-contract.yaml`
> **Data:** 2026-03-31

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/fonogramas` | Listar com paginação e filtros | JWT (futuro) | `200` |
| `POST` | `/api/v1/fonogramas` | Criar fonograma | JWT (futuro) | `201` / `409` / `422` |
| `GET` | `/api/v1/fonogramas/{id}` | Buscar por ID | JWT (futuro) | `200` / `404` |
| `PUT` | `/api/v1/fonogramas/{id}` | Atualizar (409 se ISRC alterado em LIBERADO) | JWT (futuro) | `200` / `409` |
| `DELETE` | `/api/v1/fonogramas/{id}` | Excluir (apenas PENDENTE) | JWT (futuro) | `204` / `409` |
| `POST` | `/api/v1/fonogramas/{id}/depurar` | Depurar e criar nova versão | JWT (futuro) | `201` |
| `GET` | `/api/v1/obras/{obraId}/fonogramas` | Listar fonogramas de uma obra | JWT (futuro) | `200` |

---

## Endpoints Detalhados

### POST /api/v1/fonogramas

**Request:**
```json
{
  "isrc": "BRABC2312345",
  "obraId": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "paisOrigem": "Brasil",
  "dataGravacao": "2023-06-15",
  "dataLancamento": "2023-09-01"
}
```

**Response (201):** FonogramaResponse com status PENDENTE_VALIDACAO, `isrcFormatado: "BR-ABC-23-12345"`.

### PUT /api/v1/fonogramas/{id}

**ISRC alterado em LIBERADO → 409:**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Depuração Necessária",
  "status": 409,
  "detail": "Alterar o ISRC de um fonograma LIBERADO requer depuração",
  "code": "DEPURACAO_NECESSARIA"
}
```

### POST /api/v1/fonogramas/{id}/depurar

**Response (201):**
```json
{
  "fonogramaDepurado": {
    "id": "b1c2d3e4-...",
    "isrcFormatado": "BR-ABC-23-12345",
    "status": "DEPURADO",
    "fonogramaDepuradoParaId": "novo-id-..."
  },
  "novoFonograma": {
    "id": "novo-id-...",
    "isrcFormatado": "BR-ABC-23-99999",
    "status": "PENDENTE_VALIDACAO",
    "fonogramaDepuradoParaId": null
  }
}
```

### GET /api/v1/obras/{obraId}/fonogramas

**Response (200):** Array de `FonogramaResumoResponse` (sem paginação — volume pequeno por obra).

---

## Schemas Principais

### FonogramaResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | ID único |
| `isrc` | `string (12)` | Sim | ISRC sem formatação |
| `isrcFormatado` | `string` | Sim | CC-XXX-YY-NNNNN |
| `obra` | `ObraResumo` | Sim | Obra vinculada (id, titulo, status) |
| `paisOrigem` | `string (100)` | Sim | Texto livre |
| `dataGravacao` | `date` | Não | ISO 8601 |
| `dataLancamento` | `date` | Não | ISO 8601 |
| `status` | `enum` | Sim | PENDENTE_VALIDACAO, PENDENTE_DOCUMENTACAO, LIBERADO, DEPURADO |
| `fonogramaDepuradoParaId` | `uuid` | Não | ID do novo fonograma (se DEPURADO) |
| `criadoEm` | `date-time` | Sim | ISO 8601 |
| `atualizadoEm` | `date-time` | Sim | ISO 8601 |

---

## Códigos de Erro

| Status | Code | Quando |
|--------|------|--------|
| `400` | — | Campos obrigatórios ausentes, formato ISRC inválido |
| `404` | — | Fonograma ou obra não encontrado |
| `409` | `DEPURACAO_NECESSARIA` | PUT com ISRC diferente em fonograma LIBERADO |
| `409` | — | ISRC duplicado, exclusão de LIBERADO/DEPURADO, status inválido |
| `422` | — | Obra não encontrada, regra de negócio violada |
| `500` | — | Erro inesperado |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| ISRC armazenado sem hífens (12 chars) | Uniformiza busca; frontend formata com `isrcFormatado` |
| `isrcFormatado` no response | Mesmo padrão de `documentoFormatado` em Titulares |
| Obra como objeto aninhado (não apenas ID) | Frontend exibe título da obra sem request extra |
| Fonogramas da obra sem paginação | Volume pequeno por obra; array direto |
| DELETE retorna 204 (não 200 com body) | Diferente de titularidades — fonograma não tem "soma" para retornar |
| PUT aceita ISRC no body | Se diferente do atual e LIBERADO → 409; se PENDENTE → atualiza |

---

*Contrato gerado com a skill `flow-contract-creator`. Mock server: `npx @stoplight/prism-cli mock api-contract.yaml`*
