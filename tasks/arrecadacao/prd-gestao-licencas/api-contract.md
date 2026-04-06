# API Contract — F03: Gestão de Licenças

> **Contrato gerado a partir do PRD:** `tasks/arrecadacao/prd-gestao-licencas/prd.md`
> **Spec OpenAPI:** `tasks/arrecadacao/prd-gestao-licencas/api-contract.yaml`
> **Data:** 2026-04-04

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/licencas` | Listar com paginação e filtros | JWT Bearer | `200` |
| `POST` | `/api/v1/licencas` | Criar licença (Usuário ATIVO + Rubrica) | JWT (Analista) | `201` / `422` |
| `GET` | `/api/v1/licencas/{id}` | Buscar por ID | JWT Bearer | `200` / `404` |
| `POST` | `/api/v1/licencas/{id}/suspender` | Suspender licença (ATIVA → SUSPENSA) | JWT (Analista) | `200` / `422` |
| `POST` | `/api/v1/licencas/{id}/reativar` | Reativar licença (SUSPENSA → ATIVA) | JWT (Analista) | `200` / `422` |
| `POST` | `/api/v1/licencas/{id}/encerrar` | Encerrar licença (SUSPENSA → ENCERRADA) | JWT (Analista) | `200` / `422` |
| `GET` | `/api/v1/licencas/{id}/historico-status` | Listar histórico de transições de status | JWT Bearer | `200` / `404` |

---

## Endpoints Detalhados

### GET /api/v1/licencas

**Propósito:** Lista paginada de Licenças com filtros e ordenação server-side.

**Quem consome:**
- Frontend — tela de listagem de licenças com filtros e paginação
- F04 — seleção de licença ao registrar pagamento (filtros por usuarioMusicaId + status ATIVA/SUSPENSA)

**Query Parameters:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `page` | int | 1 | Página (começa em 1) |
| `size` | int | 20 | Itens por página (máx 100) |
| `sort` | string | `-dataInicio` | Campo de ordenação. `-` para DESC |
| `usuarioMusicaId` | uuid | — | Filtro exato por ID do Usuário de Música |
| `razaoSocial` | string | — | Filtro parcial na razão social do Usuário (case-insensitive) |
| `rubricaSigla` | string | — | Filtro parcial na sigla da Rubrica (case-insensitive) |
| `status` | enum | — | ATIVA, SUSPENSA ou ENCERRADA |
| `vigente` | boolean | — | `true` = dataFim null OU dataFim >= hoje; `false` = dataFim < hoje |

**Request:**
```http
GET /api/v1/licencas?page=1&size=20&status=ATIVA&vigente=true HTTP/1.1
Host: localhost:5003
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "usuarioMusica": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "razaoSocial": "Rádio Cidade FM Ltda",
        "cnpjFormatado": "50.997.063/0001-32"
      },
      "rubrica": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "sigla": "EXEC_PUB",
        "nome": "Execução Pública"
      },
      "dataInicio": "2026-04-05",
      "dataFim": null,
      "status": "ATIVA",
      "criadoEm": "2026-04-05T10:30:00Z",
      "atualizadoEm": "2026-04-05T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /api/v1/licencas

**Propósito:** Criar uma nova licença vinculando Usuário de Música a Rubrica. Status inicial é sempre ATIVA.

**Quem consome:** Frontend — formulário de cadastro de licença

**Regras de negócio aplicadas:**
- RF-02: Múltiplas licenças simultâneas para o mesmo par Usuário+Rubrica são permitidas
- RF-03: Usuário deve estar ATIVO
- RF-04: `dataInicio` >= data atual
- RF-05: `dataFim` > `dataInicio` (se informada)

**Request:**
```http
POST /api/v1/licencas HTTP/1.1
Host: localhost:5003
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "usuarioMusicaId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "rubricaId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "dataInicio": "2026-04-05",
  "dataFim": null
}
```

**Response (201 Created):** Retorna o objeto completo `LicencaResponse`.

**Headers de resposta:**
```
Location: /api/v1/licencas/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response (422 — Usuário INATIVO):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Usuário de Música está INATIVO e não pode receber novas licenças"
}
```

**Response (422 — dataInicio no passado):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "dataInicio não pode ser anterior à data atual"
}
```

**Response (422 — dataFim inválida):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "dataFim deve ser posterior a dataInicio"
}
```

---

### GET /api/v1/licencas/{id}

**Propósito:** Dados completos de uma Licença específica, incluindo `usuarioMusica` e `rubrica` expandidos.

**Quem consome:** Frontend (tela de detalhe), F04 (validar licença antes de registrar pagamento)

**Response (200 OK):** Objeto `LicencaResponse` completo (mesmo schema da listagem).

**Response (404 Not Found):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Licença com ID 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' não foi encontrada"
}
```

---

### POST /api/v1/licencas/{id}/suspender

**Propósito:** Suspender uma licença ATIVA. Registra transição ATIVA → SUSPENSA no histórico.

**Regra de negócio:** Somente licenças com status ATIVA podem ser suspensas (RF-07).

**Request:**
```json
{
  "justificativa": "Pendência financeira identificada — aguardando regularização"
}
```

**Response (200 OK):** Objeto `LicencaResponse` com status = SUSPENSA.

**Response (422 — status inválido):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Somente licenças ATIVAS podem ser suspensas. Status atual: SUSPENSA"
}
```

---

### POST /api/v1/licencas/{id}/reativar

**Propósito:** Reativar uma licença SUSPENSA. Registra transição SUSPENSA → ATIVA no histórico.

**Regra de negócio:** Somente licenças com status SUSPENSA podem ser reativadas (RF-08).

**Request:**
```json
{
  "justificativa": "Pendência financeira regularizada — licença reativada"
}
```

**Response (200 OK):** Objeto `LicencaResponse` com status = ATIVA.

**Response (422 — status inválido):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Somente licenças SUSPENSAS podem ser reativadas. Status atual: ATIVA"
}
```

---

### POST /api/v1/licencas/{id}/encerrar

**Propósito:** Encerrar definitivamente uma licença SUSPENSA. Registra transição SUSPENSA → ENCERRADA no histórico. Operação irreversível.

**Regras de negócio:**
- RF-09: Somente licenças SUSPENSAS podem ser encerradas
- RF-11: Tentativa de encerrar ATIVA retorna 422 com mensagem orientando a suspender primeiro
- RF-12: ENCERRADA é estado terminal

**Request:**
```json
{
  "justificativa": "Contrato de licenciamento rescindido pelo Usuário de Música"
}
```

**Response (200 OK):** Objeto `LicencaResponse` com status = ENCERRADA.

**Response (422 — tentativa de encerrar ATIVA):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Somente licenças SUSPENSAS podem ser encerradas. Suspenda a licença antes de encerrá-la."
}
```

**Response (422 — já encerrada):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Licença já está ENCERRADA. Esta transição não é permitida."
}
```

---

### GET /api/v1/licencas/{id}/historico-status

**Propósito:** Histórico completo de transições de status da licença, ordenado do mais recente ao mais antigo.

**Quem consome:** Frontend — aba de histórico na tela de detalhe da licença

**Response (200 OK):**
```json
[
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "statusAnterior": "ATIVA",
    "statusNovo": "SUSPENSA",
    "justificativa": "Pendência financeira identificada — aguardando regularização",
    "autor": "analista.arrecadacao",
    "data": "2026-04-10T14:30:00Z"
  },
  {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "statusAnterior": null,
    "statusNovo": "ATIVA",
    "justificativa": "Licença criada",
    "autor": "analista.arrecadacao",
    "data": "2026-04-05T10:30:00Z"
  }
]
```

**Response (404 Not Found):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Licença com ID 'a1b2c3d4-...' não foi encontrada"
}
```

---

## Schemas

### LicencaResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | Identificador único da licença |
| `usuarioMusica` | `UsuarioMusicaResumo` | Sim | Dados resumidos do Usuário de Música |
| `rubrica` | `RubricaResumo` | Sim | Dados resumidos da Rubrica |
| `dataInicio` | `date` | Sim | Data de início da vigência (ISO 8601, formato `date`) |
| `dataFim` | `date` | Não | Data de fim da vigência (null = indefinida) |
| `status` | `enum (ATIVA, SUSPENSA, ENCERRADA)` | Sim | Status atual da licença |
| `criadoEm` | `datetime` | Sim | Data/hora de criação |
| `atualizadoEm` | `datetime` | Sim | Data/hora da última atualização |

### UsuarioMusicaResumo

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | ID do Usuário de Música |
| `razaoSocial` | `string` | Sim | Razão social |
| `cnpjFormatado` | `string` | Sim | CNPJ formatado (AA.BBB.CCC/DDDD-EE) |

### RubricaResumo

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | ID da Rubrica |
| `sigla` | `string` | Sim | Sigla da Rubrica |
| `nome` | `string` | Sim | Nome completo da Rubrica |

### CriarLicencaRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `usuarioMusicaId` | `uuid` | Sim | ID do Usuário de Música (deve estar ATIVO) |
| `rubricaId` | `uuid` | Sim | ID da Rubrica |
| `dataInicio` | `date` | Sim | Data de início (>= data atual) |
| `dataFim` | `date` | Não | Data de fim (> dataInicio se informada; null = indefinida) |

### TransicaoStatusRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `justificativa` | `string (mín 10, máx 500)` | Sim | Justificativa da transição |

### HistoricoStatusLicencaResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | ID do registro de histórico |
| `statusAnterior` | `enum` | Não | Status antes da transição (null na criação) |
| `statusNovo` | `enum` | Sim | Novo status após a transição |
| `justificativa` | `string` | Sim | Texto da justificativa |
| `autor` | `string` | Sim | Username do autor (extraído do JWT) |
| `data` | `datetime` | Sim | Data/hora da transição (ISO 8601) |

---

## Códigos de Erro

| Status | Código | Quando |
|--------|--------|--------|
| `400` | Validation Error | Campos obrigatórios ausentes, formato inválido, justificativa < 10 chars |
| `401` | Unauthorized | Token JWT ausente, expirado ou inválido |
| `403` | Forbidden | Consultor tentando executar ação de escrita (criar, suspender, reativar, encerrar) |
| `404` | Resource Not Found | ID não corresponde a nenhuma Licença |
| `422` | Unprocessable Entity | Usuário INATIVO, dataInicio no passado, dataFim inválida, transição de status inválida |
| `500` | Internal Server Error | Falha inesperada no servidor |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| JWT Bearer via Keycloak | Padrão do projeto |
| Roles: analista-arrecadacao (R+W), consultor-arrecadacao (R) | Consistente com F02 e Domain Doc |
| Endpoints de transição separados (`/suspender`, `/reativar`, `/encerrar`) | Justificativa obrigatória + histórico + semântica clara — evita PATCH genérico |
| `usuarioMusica` e `rubrica` expandidos na resposta | RF-17 — evita N+1 no frontend |
| Histórico como sub-recurso | Padrão REST — `/licencas/{id}/historico-status` (igual F02) |
| dataInicio/dataFim como `date` (não `datetime`) | Licença tem vigência por dia, não por hora |
| Filtro `vigente` como boolean (não enum) | Caso de uso binário — vigente ou não |
| Sort padrão `-dataInicio` | Licenças mais recentes primeiro — mais relevante para operadores |
| Autor do histórico extraído do JWT | Claim `preferred_username` — sem campo manual. Padrão F02 |
| Status inicial hardcoded como ATIVA | RF-06 — não aceitar status no request body de criação |
| Encerramento direto de ATIVA retorna 422 com instrução | RF-11 — mensagem orientativa melhora UX e reduz erros |
| camelCase nos campos JSON | Convenção do projeto |
| Erros seguem RFC 7807 (ProblemDetails) | Padrão do projeto |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server imediato: `npx @stoplight/prism-cli mock api-contract.yaml`*
