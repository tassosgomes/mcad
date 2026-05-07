# API Contract — F02: Gestão de Processos de Distribuição

> **Contrato gerado a partir do PRD:** `tasks/distribuicao/prd-gestao-processos/prd.md`
> **Spec OpenAPI:** `tasks/distribuicao/prd-gestao-processos/api-contract.yaml`
> **Data:** 2026-04-10

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Roles |
|--------|------|-----------|------|-------|
| `GET` | `/api/v1/processos/disponiveis` | Combinações prontas para distribuição | JWT | Analista, Consultor |
| `GET` | `/api/v1/processos` | Listar processos (paginado, filtros) | JWT | Analista, Consultor |
| `POST` | `/api/v1/processos` | Criar processo | JWT | Analista |
| `GET` | `/api/v1/processos/{id}` | Detalhes do processo | JWT | Analista, Consultor |
| `POST` | `/api/v1/processos/{id}/calcular` | Disparar cálculo (→ CALCULADO) | JWT | Analista |
| `POST` | `/api/v1/processos/{id}/aprovar` | Aprovar (→ APROVADO) | JWT | Analista |
| `POST` | `/api/v1/processos/{id}/finalizar` | Finalizar (→ FINALIZADO, irreversível) | JWT | Analista |
| `POST` | `/api/v1/processos/{id}/cancelar` | Cancelar (→ CANCELADO, justificativa) | JWT | Analista |

---

## Endpoints Detalhados

### GET /api/v1/processos/disponiveis

**Propósito:** Lista combinações rubrica+período que têm Rol fechado + Verba disponível e sem processo ativo.

**Quem consome:** Frontend — tela de criação de processo (seleção de rubrica+período).

**Request:**
```http
GET /api/v1/processos/disponiveis HTTP/1.1
Host: localhost:5004
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
[
  {
    "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
    "periodo": "2026-03",
    "verbaLiquida": 85000.00,
    "totalExecucoes": 1250
  },
  {
    "rubrica": { "sigla": "TV_ABERTA", "nome": "TV Aberta" },
    "periodo": "2026-03",
    "verbaLiquida": 120000.00,
    "totalExecucoes": 3400
  }
]
```

**Response (200 OK — nenhuma disponível):**
```json
[]
```

---

### GET /api/v1/processos

**Propósito:** Lista paginada de processos com filtros.

**Quem consome:** Frontend — tela de listagem de processos.

**Filtros:** rubrica (sigla), periodo (YYYY-MM), status (múltiplos separados por vírgula).

**Paginação:** page/size (padrão: page=1, size=20).

**Request:**
```http
GET /api/v1/processos?rubrica=RADIO&status=CRIADO,CALCULADO&page=1&size=20 HTTP/1.1
Host: localhost:5004
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
      "periodo": "2026-03",
      "status": "CALCULADO",
      "verbaLiquida": 85000.00,
      "totalExecucoes": 1250,
      "analistaResponsavel": "João Silva",
      "criadoEm": "2026-04-10T14:30:00Z",
      "calculadoEm": "2026-04-10T14:35:00Z",
      "aprovadoEm": null,
      "finalizadoEm": null,
      "canceladoEm": null,
      "justificativaCancelamento": null
    }
  ],
  "metadata": {
    "page": 1,
    "size": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /api/v1/processos

**Propósito:** Cria processo de distribuição para rubrica+período.

**Quem consome:** Frontend — tela de criação.

**Validações:**
- Rol fechado deve existir para rubrica+período
- Verba disponível deve existir para rubrica+período
- Não pode existir processo não-cancelado para rubrica+período

**Request:**
```http
POST /api/v1/processos HTTP/1.1
Host: localhost:5004
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "rubricaSigla": "RADIO",
  "periodo": "2026-03"
}
```

**Response (201 Created):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
  "periodo": "2026-03",
  "status": "CRIADO",
  "verbaLiquida": 85000.00,
  "totalExecucoes": null,
  "analistaResponsavel": "João Silva",
  "criadoEm": "2026-04-10T14:30:00Z",
  "calculadoEm": null,
  "aprovadoEm": null,
  "finalizadoEm": null,
  "canceladoEm": null,
  "justificativaCancelamento": null
}
```

**Response (409 Conflict):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Conflict",
  "status": 409,
  "detail": "Já existe um processo de distribuição ativo para rubrica RADIO período 2026-03",
  "instance": "/api/v1/processos"
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Não existe Rol de Execuções fechado para rubrica RADIO período 2026-03",
  "instance": "/api/v1/processos"
}
```

---

### GET /api/v1/processos/{id}

**Propósito:** Detalhes completos do processo com datas de transição.

**Quem consome:** Frontend — tela de detalhes com botões de ação por estado.

**Response (200 OK):** Mesmo schema de `ProcessoResponse` (ver POST response acima).

**Response (404 Not Found):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Processo de distribuição não encontrado",
  "instance": "/api/v1/processos/f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

---

### POST /api/v1/processos/{id}/calcular

**Propósito:** Dispara cálculo de créditos (CRIADO → CALCULADO).

**Nota:** A lógica de cálculo (split, ponderação) é da F03. Este endpoint define a interface.

**Request:**
```http
POST /api/v1/processos/f47ac10b-58cc-4372-a567-0e02b2c3d479/calcular HTTP/1.1
Host: localhost:5004
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):** `ProcessoResponse` com status CALCULADO.

**Response (422):** `"Transição inválida: processo no estado CALCULADO não pode ser calculado novamente"`

---

### POST /api/v1/processos/{id}/aprovar

**Propósito:** Aprova processo (CALCULADO → APROVADO). Ação direta sem confirmação.

**Request:**
```http
POST /api/v1/processos/f47ac10b-58cc-4372-a567-0e02b2c3d479/aprovar HTTP/1.1
Host: localhost:5004
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):** `ProcessoResponse` com status APROVADO.

**Response (422):** `"Transição inválida: CRIADO → APROVADO. O processo precisa ser calculado antes de ser aprovado"`

---

### POST /api/v1/processos/{id}/finalizar

**Propósito:** Finaliza processo (APROVADO → FINALIZADO). Irreversível. Publica `distribuicao.rol.processado`.

**Request:**
```http
POST /api/v1/processos/f47ac10b-58cc-4372-a567-0e02b2c3d479/finalizar HTTP/1.1
Host: localhost:5004
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):** `ProcessoResponse` com status FINALIZADO e `finalizadoEm` preenchido.

**Response (422):** `"Transição inválida: processo no estado CALCULADO não pode ser finalizado. Aprove antes de finalizar"`

---

### POST /api/v1/processos/{id}/cancelar

**Propósito:** Cancela processo (qualquer estado exceto FINALIZADO). Justificativa obrigatória.

**Request:**
```http
POST /api/v1/processos/f47ac10b-58cc-4372-a567-0e02b2c3d479/cancelar HTTP/1.1
Host: localhost:5004
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "justificativa": "Dados incorretos no Rol de Execuções. Necessário recriar com dados corrigidos."
}
```

**Response (200 OK):** `ProcessoResponse` com status CANCELADO, `canceladoEm` e `justificativaCancelamento` preenchidos.

**Response (400):** `"Justificativa é obrigatória e deve ter no mínimo 10 caracteres"`

**Response (422):** `"Processo finalizado não pode ser cancelado"`

---

## Schemas

### ProcessoResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `string (uuid)` | Sim | Identificador único do processo |
| `rubrica` | `RubricaResumo` | Sim | Rubrica associada (sigla + nome) |
| `periodo` | `string (YYYY-MM)` | Sim | Período da distribuição |
| `status` | `enum` | Sim | CRIADO, CALCULADO, APROVADO, FINALIZADO, CANCELADO |
| `verbaLiquida` | `number` | Sim | Verba líquida snapshot (BigDecimal) |
| `totalExecucoes` | `integer` | Não | Total de execuções (preenchido após cálculo) |
| `analistaResponsavel` | `string` | Sim | Nome do analista (do JWT) |
| `criadoEm` | `date-time` | Sim | Data de criação |
| `calculadoEm` | `date-time` | Não | Data do cálculo |
| `aprovadoEm` | `date-time` | Não | Data da aprovação |
| `finalizadoEm` | `date-time` | Não | Data da finalização |
| `canceladoEm` | `date-time` | Não | Data do cancelamento |
| `justificativaCancelamento` | `string` | Não | Justificativa (quando cancelado) |

### CriarProcessoRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `rubricaSigla` | `string (max 20)` | Sim | Sigla da rubrica |
| `periodo` | `string (YYYY-MM)` | Sim | Período da distribuição |

### CancelarProcessoRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `justificativa` | `string (10-500)` | Sim | Justificativa obrigatória (min 10 chars) |

### DisponibilidadeResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `rubrica` | `RubricaResumo` | Sim | Rubrica disponível |
| `periodo` | `string (YYYY-MM)` | Sim | Período disponível |
| `verbaLiquida` | `number` | Sim | Verba líquida disponível (BigDecimal) |
| `totalExecucoes` | `integer` | Sim | Total de execuções no Rol |

---

## Códigos de Erro

| Status | Código | Quando |
|--------|--------|--------|
| `400` | Bad Request | Justificativa de cancelamento inválida (< 10 chars) |
| `401` | Unauthorized | Token JWT ausente, expirado ou inválido |
| `404` | Not Found | Processo com ID informado não existe |
| `409` | Conflict | Já existe processo ativo para rubrica+período |
| `422` | Unprocessable Entity | Pré-requisitos não atendidos (Rol/Verba ausente) ou transição de estado inválida |
| `500` | Internal Server Error | Falha inesperada no servidor |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| JWT Bearer via Keycloak | Consistente com F01 e demais domínios |
| Ações de escrita requerem role `analista-distribuicao` | Consultor tem acesso somente leitura |
| Transições via POST em sub-recurso (`/aprovar`, `/cancelar`) | Padrão REST para ações que não são CRUD puro |
| `calcular` define interface mas lógica é da F03 | Desacoplamento — F02 gerencia estado, F03 gerencia cálculo |
| Analista extraído do JWT (claim `preferred_username`) | Sem input do usuário — rastreabilidade automática |
| Verba como `number` (não string) | BigDecimal no backend garante precisão; JSON number é suficiente para exibição |
| `totalExecucoes` nullable | Só preenchido após cálculo (F03) |
| Paginação page/size | Consistente com arrecadacao-api (PageResponse) |
| Filtro de status multi-valor (vírgula) | Permite filtrar ex: "CRIADO,CALCULADO" para ver pendentes |
| 409 para duplicidade | Mais semântico que 422 para conflito de unicidade |
| Justificativa min 10 chars | Garante justificativa minimamente significativa |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server imediato: `npx @stoplight/prism-cli mock api-contract.yaml`*
