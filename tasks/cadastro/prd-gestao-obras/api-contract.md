# API Contract — F03: Gestão de Obras Musicais

> **Contrato gerado a partir do PRD:** `tasks/prd-gestao-obras/prd.md`
> **Spec OpenAPI:** `tasks/prd-gestao-obras/api-contract.yaml`
> **Data:** 2026-03-30

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/obras` | Listar com paginação e filtros | JWT (futuro) | `200` |
| `POST` | `/api/v1/obras` | Criar obra (status PENDENTE) | JWT (futuro) | `201` |
| `GET` | `/api/v1/obras/{id}` | Buscar por ID | JWT (futuro) | `200` / `404` |
| `PUT` | `/api/v1/obras/{id}` | Atualizar (409 se requer depuração) | JWT (futuro) | `200` / `409` |
| `DELETE` | `/api/v1/obras/{id}` | Excluir (se sem vínculos) | JWT (futuro) | `204` / `409` |
| `POST` | `/api/v1/obras/{id}/iswc` | Obter ISWC via API externa | JWT (futuro) | `200` / `502` |
| `POST` | `/api/v1/obras/{id}/depurar` | Depurar obra e criar nova versão | JWT (futuro) | `201` |
| `PUT` | `/api/v1/obras/{id}/dominio-publico` | Marcar/desmarcar Domínio Público | JWT (futuro) | `200` / `409` |

---

## Endpoints Detalhados

### POST /api/v1/obras

**Propósito:** Criar obra musical como rascunho (PENDENTE).

**Request:**
```json
{
  "titulo": "Meu Bem Querer",
  "tipo": "LITEROMUSICAL",
  "genero": "MPB",
  "subtitulo": null
}
```

**Response (201):**
```json
{
  "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "titulo": "Meu Bem Querer",
  "subtitulo": null,
  "tipo": "LITEROMUSICAL",
  "genero": "MPB",
  "iswc": null,
  "status": "PENDENTE",
  "dominioPublico": false,
  "obraDepuradaParaId": null,
  "criadoEm": "2026-03-30T14:30:00Z",
  "atualizadoEm": "2026-03-30T14:30:00Z"
}
```

---

### POST /api/v1/obras/{id}/iswc

**Propósito:** Obter ISWC da API externa e salvar na obra. Requer titulares autorais vinculados.

**Request:** Sem body — os dados são extraídos da obra e seus titulares.

**Response (200 — sucesso):**
```json
{
  "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "titulo": "Meu Bem Querer",
  "iswc": "T-336305833-4",
  "status": "PENDENTE",
  "..."
}
```

**Response (422 — sem titulares):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Obra deve ter ao menos um titular autoral vinculado para obter ISWC"
}
```

**Response (502 — API indisponível):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.6.3",
  "title": "Bad Gateway",
  "status": 502,
  "detail": "Não foi possível obter o ISWC neste momento. Por favor, tente novamente mais tarde."
}
```

---

### PUT /api/v1/obras/{id}

**Propósito:** Atualizar dados editáveis. Se obra LIBERADA e título alterado → retorna 409 exigindo depuração.

**Response (409 — depuração necessária):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Depuração Necessária",
  "status": 409,
  "detail": "Esta obra está LIBERADA. Alterar o título requer depuração.",
  "code": "DEPURACAO_NECESSARIA"
}
```

> **Nota para frontend:** Ao receber 409 com `code: "DEPURACAO_NECESSARIA"`, exibir modal de confirmação e chamar `POST /obras/{id}/depurar`.

---

### POST /api/v1/obras/{id}/depurar

**Propósito:** Confirmar depuração de obra LIBERADA — cria nova versão automaticamente.

**Request:**
```json
{
  "titulo": "Meu Bem Querer (Remix)",
  "tipo": "LITEROMUSICAL",
  "genero": "MPB",
  "subtitulo": null
}
```

**Response (201):**
```json
{
  "obraDepurada": {
    "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
    "titulo": "Meu Bem Querer",
    "iswc": "T-336305833-4",
    "status": "DEPURADA",
    "obraDepuradaParaId": "e2f3a4b5-c6d7-8901-bcde-f12345678901"
  },
  "novaObra": {
    "id": "e2f3a4b5-c6d7-8901-bcde-f12345678901",
    "titulo": "Meu Bem Querer (Remix)",
    "iswc": null,
    "status": "PENDENTE",
    "obraDepuradaParaId": null
  }
}
```

---

### PUT /api/v1/obras/{id}/dominio-publico

**Request:**
```json
{ "dominioPublico": true }
```

**Response (200):** ObraResponse com status `DOMINIO_PUBLICO`.

---

## Schemas Principais

### ObraResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | ID único |
| `titulo` | `string (max 300)` | Sim | Título da obra |
| `subtitulo` | `string (max 300)` | Não | Subtítulo |
| `tipo` | `enum` | Sim | MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI |
| `genero` | `string (max 100)` | Não | Gênero (texto livre) |
| `iswc` | `string` | Não | Código ISWC (obtido via API) |
| `status` | `enum` | Sim | PENDENTE, LIBERADO, BLOQUEADO, DOMINIO_PUBLICO, DEPURADA |
| `dominioPublico` | `boolean` | Sim | Flag de Domínio Público |
| `obraDepuradaParaId` | `uuid` | Não | ID da nova obra (se DEPURADA) |
| `criadoEm` | `date-time` | Sim | ISO 8601 |
| `atualizadoEm` | `date-time` | Sim | ISO 8601 |

---

## Códigos de Erro

| Status | Code | Quando |
|--------|------|--------|
| `400` | — | Campos obrigatórios ausentes |
| `404` | — | Obra não encontrada |
| `409` | `DEPURACAO_NECESSARIA` | PUT em obra LIBERADA com alteração de título |
| `409` | — | Exclusão de obra com vínculos ou DEPURADA |
| `409` | — | ISWC já existe em outra obra |
| `409` | — | Operação não permitida para status atual |
| `422` | — | Sem titulares autorais para obter ISWC |
| `502` | — | API de ISWC indisponível |
| `500` | — | Erro inesperado |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| `POST /obras/{id}/iswc` sem body | Dados extraídos da obra + titulares no backend |
| `POST /obras/{id}/depurar` com body | Frontend envia dados atualizados para a nova obra |
| `PUT` retorna 409 para depuração (não 200) | Frontend precisa do `code` para decidir mostrar modal |
| `DepuracaoResponse` com ambas as obras | Frontend redireciona para `novaObra.id` e mostra toast |
| `PUT /obras/{id}/dominio-publico` separado | Semântica distinta de edição de campos — é uma operação de status |
| `code` no ProblemDetails | Extensão do RFC 7807 para lógica condicional no frontend |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server: `npx @stoplight/prism-cli mock api-contract.yaml`*
