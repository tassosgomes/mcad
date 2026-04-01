# API Contract — F07: Controle de Status

> **Contrato gerado a partir do PRD:** `tasks/prd-controle-status/prd.md`
> **Spec OpenAPI:** `tasks/prd-controle-status/api-contract.yaml`
> **Data:** 2026-04-01

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `POST` | `/api/v1/obras/{id}/liberar` | Liberar obra (valida pré-requisitos) | JWT (futuro) | `200` / `422` |
| `POST` | `/api/v1/obras/{id}/bloquear` | Bloquear obra (justificativa) | JWT (futuro) | `200` / `409` |
| `POST` | `/api/v1/obras/{id}/desbloquear` | Desbloquear obra → PENDENTE | JWT (futuro) | `200` / `409` |
| `POST` | `/api/v1/fonogramas/{id}/liberar` | Liberar fonograma (valida pré-requisitos) | JWT (futuro) | `200` / `422` |
| `POST` | `/api/v1/fonogramas/{id}/bloquear` | Bloquear fonograma (justificativa) | JWT (futuro) | `200` / `409` |
| `POST` | `/api/v1/fonogramas/{id}/desbloquear` | Desbloquear fonograma → PENDENTE_VALIDACAO | JWT (futuro) | `200` / `409` |
| `GET` | `/api/v1/obras/{id}/historico-bloqueios` | Histórico de bloqueios da obra | JWT (futuro) | `200` |
| `GET` | `/api/v1/fonogramas/{id}/historico-bloqueios` | Histórico de bloqueios do fonograma | JWT (futuro) | `200` |

---

## Endpoints Detalhados

### POST /obras/{id}/liberar

**Response (200):** ObraResponse com status=LIBERADO.

**Response (422 — pendências):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Pré-requisitos não atendidos",
  "status": 422,
  "detail": "Não é possível liberar. Existem pendências.",
  "pendencias": [
    { "item": "ISWC", "atendido": false, "detalhe": "ISWC não obtido" },
    { "item": "Titularidades", "atendido": false, "detalhe": "Soma (80.0000%) diferente de 100%" },
    { "item": "Título", "atendido": true },
    { "item": "Tipo", "atendido": true }
  ]
}
```

> **Frontend:** Exibir lista de pendências como checklist visual (check verde / cross vermelho por item).

---

### POST /obras/{id}/bloquear

**Request:**
```json
{
  "justificativa": "Conflito de titularidade com processo judicial em andamento"
}
```

**Response (200):** ObraResponse com status=BLOQUEADO + bloqueioJustificativa preenchida.

---

### POST /fonogramas/{id}/liberar

**Response (422 — pendências):**
```json
{
  "pendencias": [
    { "item": "ISRC", "atendido": true },
    { "item": "Participações Conexas", "atendido": true },
    { "item": "Obra LIBERADA", "atendido": false, "detalhe": "Obra vinculada com status PENDENTE" },
    { "item": "URL Áudio", "atendido": false, "detalhe": "URL de áudio não preenchida" }
  ]
}
```

---

### GET /obras/{id}/historico-bloqueios

**Response (200):**
```json
[
  {
    "id": "h1-...",
    "acao": "BLOQUEIO",
    "justificativa": "Conflito de titularidade",
    "dataHora": "2026-04-01T10:30:00Z"
  },
  {
    "id": "h2-...",
    "acao": "DESBLOQUEIO",
    "justificativa": null,
    "dataHora": "2026-04-01T14:00:00Z"
  }
]
```

---

## Schemas Novos

### BloquearRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `justificativa` | `string (10-500)` | Sim | Justificativa do bloqueio |

### PreRequisitosResponse (extensão de ProblemDetails)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pendencias` | `PreRequisitoItem[]` | Lista de pré-requisitos com status atendido/pendente |

### PreRequisitoItem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `item` | `string` | Nome do pré-requisito (ISWC, Titularidades, etc.) |
| `atendido` | `boolean` | true/false |
| `detalhe` | `string?` | Detalhe quando não atendido |

### HistoricoBloqueioItem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `uuid` | ID do registro |
| `acao` | `enum` | BLOQUEIO ou DESBLOQUEIO |
| `justificativa` | `string?` | Presente apenas em BLOQUEIO |
| `dataHora` | `date-time` | ISO 8601 |

### Campos adicionados aos schemas existentes

| Schema | Campo | Tipo | Descrição |
|--------|-------|------|-----------|
| ObraResponse | `bloqueioJustificativa` | `string?` | Último bloqueio |
| FonogramaResponse | `urlAudio` | `string?` | URL do áudio |
| FonogramaResponse | `bloqueioJustificativa` | `string?` | Último bloqueio |

---

## Códigos de Erro

| Status | Quando |
|--------|--------|
| `400` | Justificativa < 10 chars |
| `404` | Entidade não encontrada |
| `409` | Status atual não permite operação (ex: liberar BLOQUEADO, desbloquear PENDENTE) |
| `422` | Pré-requisitos de liberação não atendidos (retorna lista de pendências) |
| `500` | Erro inesperado |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| POST sem body para liberar/desbloquear | Sem dados extras — apenas ação |
| 422 com `pendencias` array (não 409) | Não é conflito de estado — é validação de pré-requisitos com detalhes ricos |
| Desbloqueio → PENDENTE (não LIBERADO) | Precisa re-liberar após desbloquear — garante que pré-requisitos são revalidados |
| Histórico como sub-resource GET | Array cronológico simples, sem paginação |
| `bloqueioJustificativa` na response principal | Evita GET extra para saber se está bloqueado e por quê |
| urlAudio no PUT /fonogramas/{id} existente | Não merece endpoint separado — é um campo da entidade |

---

*Contrato gerado com a skill `flow-contract-creator`.*
