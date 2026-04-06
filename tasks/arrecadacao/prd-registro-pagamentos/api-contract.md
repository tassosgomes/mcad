# API Contract — F04: Registro de Pagamentos

> Domínio: Arrecadação (D03) | Feature: F04 | Servidor: `http://localhost:5003/api/v1`
> Autenticação: JWT Bearer via Keycloak | Roles: `analista-arrecadacao` (leitura + escrita), `consultor-arrecadacao` (somente leitura)
> Erros: RFC 7807 ProblemDetails | Valores monetários: string decimal (BigDecimal no backend)

---

## Endpoints

| Método | Path | Descrição | Auth | Respostas |
|--------|------|-----------|------|-----------|
| GET | `/api/v1/uda/vigente` | Consultar valor vigente da UDA | JWT (ambos) | 200, 401, 404 |
| POST | `/api/v1/uda` | Ajustar valor da UDA (novo registro) | JWT (Analista) | 201, 400, 401, 403 |
| GET | `/api/v1/uda/historico` | Histórico completo de valores da UDA | JWT (ambos) | 200, 401 |
| GET | `/api/v1/pagamentos` | Listar pagamentos com paginação e filtros | JWT (ambos) | 200, 400, 401 |
| POST | `/api/v1/pagamentos` | Registrar pagamento em UDAs contra licença | JWT (Analista) | 201, 400, 401, 403, 409, 422 |
| GET | `/api/v1/pagamentos/{id}` | Buscar pagamento por ID | JWT (ambos) | 200, 401, 404 |

---

## Decisões de Design

- **Valores monetários como string:** `valor`, `quantidadeUdas`, `valorUdaNoMomento`, `valorBruto` são representados como `string` no JSON para preservar a precisão do `BigDecimal` Java e evitar perda de casas decimais no JavaScript.
- **409 para pagamento duplicado (não 422):** O conflito de unicidade por licença+período é uma violação de invariante de estado (já existe), não de regra de formato — portanto 409 Conflict.
- **UDA como recurso independente:** `/uda/` é recurso de primeiro nível (não sub-recurso de pagamento) porque a UDA é uma entidade global do domínio, não pertencente a um agregado específico.
- **criadoPor nullable:** O seed Flyway insere o valor inicial sem usuário autenticado — campo explicitamente nullable.
- **Histórico UDA não paginado:** Volume esperado é muito pequeno (ajustes são raros). Lista completa sem paginação.
- **Período preenchido pelo backend:** O campo `periodo` (YYYY-MM) é sempre o mês corrente, calculado pelo servidor. O frontend não envia esse campo.
- **Expansão de relacionamentos no GET detalhes:** `PagamentoResponse` expande licença com resumo do Usuário de Música e da Rubrica para evitar múltiplas chamadas.

---

## Schemas

### UdaResponse

```json
{
  "id": "e1f2a3b4-c5d6-7890-ef12-34567890abcd",
  "valor": "107.310000",
  "dataVigencia": "2026-01-01",
  "criadoEm": "2026-01-01T00:00:00Z",
  "criadoPor": null
}
```

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| id | string (UUID) | não | Identificador único do registro de valor |
| valor | string (decimal) | não | Valor da UDA em R$ (alta precisão) |
| dataVigencia | string (date, YYYY-MM-DD) | não | Data a partir da qual este valor está vigente |
| criadoEm | string (datetime, ISO 8601) | não | Timestamp de criação |
| criadoPor | string | sim | Username do autor (null para seed Flyway) |

### AjustarUdaRequest

```json
{
  "valor": "115.00",
  "dataVigencia": "2026-07-01"
}
```

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| valor | string (decimal) | sim | Valor decimal > 0, até 6 casas decimais |
| dataVigencia | string (date, YYYY-MM-DD) | sim | Data válida; pode ser futura (pré-ajuste) |

### RubricaResumo

```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "sigla": "RFM",
  "nome": "Rádio FM"
}
```

### UsuarioMusicaResumo

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "razaoSocial": "Rádio Cidade FM Ltda",
  "cnpj": "50997063000132"
}
```

### LicencaResumo

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "numero": "LIC-2026-00042",
  "status": "ATIVA",
  "usuarioMusica": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "razaoSocial": "Rádio Cidade FM Ltda",
    "cnpj": "50997063000132"
  },
  "rubrica": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "sigla": "RFM",
    "nome": "Rádio FM"
  }
}
```

### PagamentoResponse

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "licenca": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "numero": "LIC-2026-00042",
    "status": "ATIVA",
    "usuarioMusica": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "razaoSocial": "Rádio Cidade FM Ltda",
      "cnpj": "50997063000132"
    },
    "rubrica": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "sigla": "RFM",
      "nome": "Rádio FM"
    }
  },
  "quantidadeUdas": "2.500000",
  "valorUdaNoMomento": "107.310000",
  "valorBruto": "268.275000",
  "periodo": "2026-04",
  "status": "CONFIRMADO",
  "dataRegistro": "2026-04-05T14:30:00Z",
  "criadoEm": "2026-04-05T14:30:00Z",
  "atualizadoEm": "2026-04-05T14:30:00Z"
}
```

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| id | string (UUID) | não | Identificador único do pagamento |
| licenca | LicencaResumo | não | Licença expandida com usuário de música e rubrica |
| quantidadeUdas | string (decimal) | não | Quantidade de UDAs pagas |
| valorUdaNoMomento | string (decimal) | não | Snapshot do valor da UDA no momento do registro (imutável) |
| valorBruto | string (decimal) | não | quantidadeUdas × valorUdaNoMomento |
| periodo | string (YYYY-MM) | não | Mês de referência do pagamento |
| status | enum: CONFIRMADO, ESTORNADO | não | Status atual do pagamento |
| dataRegistro | string (datetime, ISO 8601) | não | Momento em que o pagamento foi registrado |
| criadoEm | string (datetime, ISO 8601) | não | Timestamp de criação do registro |
| atualizadoEm | string (datetime, ISO 8601) | não | Timestamp da última atualização |

### RegistrarPagamentoRequest

```json
{
  "licencaId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "quantidadeUdas": "2.5"
}
```

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| licencaId | string (UUID) | sim | UUID válido de uma Licença existente |
| quantidadeUdas | string (decimal) | sim | Decimal > 0; frações permitidas (ex: "2.5", "0.75") |

### PagamentoListResponse

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "licenca": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "numero": "LIC-2026-00042",
        "status": "ATIVA",
        "usuarioMusica": {
          "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "razaoSocial": "Rádio Cidade FM Ltda",
          "cnpj": "50997063000132"
        },
        "rubrica": {
          "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
          "sigla": "RFM",
          "nome": "Rádio FM"
        }
      },
      "quantidadeUdas": "2.500000",
      "valorUdaNoMomento": "107.310000",
      "valorBruto": "268.275000",
      "periodo": "2026-04",
      "status": "CONFIRMADO",
      "dataRegistro": "2026-04-05T14:30:00Z",
      "criadoEm": "2026-04-05T14:30:00Z",
      "atualizadoEm": "2026-04-05T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

---

## Detalhamento dos Endpoints

---

### GET /api/v1/uda/vigente

Retorna o valor da UDA vigente na data atual (registro com maior `dataVigencia` <= hoje).

**Query parameters:** nenhum

**Response 200 — Sucesso:**

```json
{
  "id": "e1f2a3b4-c5d6-7890-ef12-34567890abcd",
  "valor": "107.310000",
  "dataVigencia": "2026-01-01",
  "criadoEm": "2026-01-01T00:00:00Z",
  "criadoPor": null
}
```

**Response 404 — Sem UDA vigente:**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Não há valor de UDA vigente para a data atual (2026-04-05)"
}
```

**Notas frontend:** Exibir o valor no formulário de registro de pagamento para que o operador veja o valor que será aplicado antes de confirmar. Formatar como moeda (R$).

**Notas backend:** Consulta: `SELECT * FROM uda_valor WHERE data_vigencia <= CURRENT_DATE ORDER BY data_vigencia DESC LIMIT 1`. Retornar 404 se nenhum registro encontrado.

---

### POST /api/v1/uda

Insere um novo registro de valor para a UDA. Operação exclusiva de Analista. Não altera registros anteriores (append-only).

**Request body:**

```json
{
  "valor": "115.00",
  "dataVigencia": "2026-07-01"
}
```

**Response 201 — Criado:**

```json
{
  "id": "f2e3d4c5-b6a7-8901-cdef-234567890abc",
  "valor": "115.000000",
  "dataVigencia": "2026-07-01",
  "criadoEm": "2026-04-05T10:00:00Z",
  "criadoPor": "analista.arrecadacao"
}
```

Header: `Location: /api/v1/uda/f2e3d4c5-b6a7-8901-cdef-234567890abc`

**Response 400 — Validação:**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Validation Error",
  "status": 400,
  "detail": "Um ou mais campos são inválidos",
  "errors": [
    {
      "field": "valor",
      "message": "O valor da UDA deve ser maior que zero"
    }
  ]
}
```

**Response 403 — Sem permissão (Consultor):**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.3",
  "title": "Forbidden",
  "status": 403,
  "detail": "Acesso negado: perfil consultor-arrecadacao não possui permissão para esta operação"
}
```

**Notas frontend:** Campo `dataVigencia` pode ser data futura (pré-agendamento de reajuste). Após sucesso, exibir toast e atualizar exibição da UDA vigente. Campo `valor` aceita até 6 casas decimais.

**Notas backend:** `criadoPor` extraído do claim `preferred_username` do JWT. Armazenar com 6 casas decimais de precisão.

---

### GET /api/v1/uda/historico

Retorna o histórico completo de valores da UDA, ordenado por `dataVigencia` DESC. Sem paginação (volume esperado é baixo).

**Query parameters:** nenhum

**Response 200 — Sucesso:**

```json
[
  {
    "id": "f2e3d4c5-b6a7-8901-cdef-234567890abc",
    "valor": "115.000000",
    "dataVigencia": "2026-07-01",
    "criadoEm": "2026-04-05T10:00:00Z",
    "criadoPor": "analista.arrecadacao"
  },
  {
    "id": "e1f2a3b4-c5d6-7890-ef12-34567890abcd",
    "valor": "107.310000",
    "dataVigencia": "2026-01-01",
    "criadoEm": "2026-01-01T00:00:00Z",
    "criadoPor": null
  }
]
```

**Notas frontend:** Exibir como tabela ou timeline. O registro com `criadoPor = null` é o seed inicial — exibir como "Sistema" ou "—". Destacar visualmente o registro vigente (maior `dataVigencia` <= hoje).

**Notas backend:** Ordenar por `data_vigencia DESC`. Array vazio `[]` se não houver registros.

---

### GET /api/v1/pagamentos

Retorna lista paginada de pagamentos com filtros e ordenação server-side.

**Query parameters:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| page | integer (min 1) | 1 | Número da página |
| size | integer (1–100) | 20 | Itens por página |
| sort | string | `-dataRegistro` | Ordenação. Prefixo `-` para DESC. Campos: `dataRegistro`, `valorBruto`, `periodo` |
| usuarioMusicaId | UUID | — | Filtro por ID do Usuário de Música |
| razaoSocial | string | — | Filtro por razão social do Usuário de Música (parcial, case-insensitive) |
| rubricaSigla | string | — | Filtro por sigla da Rubrica (exato, case-insensitive) |
| periodo | string (YYYY-MM) | — | Filtro por período de referência |
| status | enum | — | Filtro por status: `CONFIRMADO` ou `ESTORNADO` |

**Response 200 — Sucesso:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "licenca": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "numero": "LIC-2026-00042",
        "status": "ATIVA",
        "usuarioMusica": {
          "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "razaoSocial": "Rádio Cidade FM Ltda",
          "cnpj": "50997063000132"
        },
        "rubrica": {
          "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
          "sigla": "RFM",
          "nome": "Rádio FM"
        }
      },
      "quantidadeUdas": "2.500000",
      "valorUdaNoMomento": "107.310000",
      "valorBruto": "268.275000",
      "periodo": "2026-04",
      "status": "CONFIRMADO",
      "dataRegistro": "2026-04-05T14:30:00Z",
      "criadoEm": "2026-04-05T14:30:00Z",
      "atualizadoEm": "2026-04-05T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

**Notas frontend:** Debounce de 300ms no campo `razaoSocial`. Filtro de `periodo` como input mês (ex: date picker apenas mês/ano). Badge de status: CONFIRMADO (verde), ESTORNADO (vermelho). Colunas clicáveis para ordenação (toggle ASC/DESC). Valores exibidos formatados como moeda (R$).

**Notas backend:** JOIN com licenca, usuario_musica e rubrica para suportar filtros. Índice em `(licenca_id, periodo)` e `status`. Filtro `razaoSocial` usa ILIKE.

---

### POST /api/v1/pagamentos

Registra um novo pagamento em UDAs contra uma Licença existente.

**Request body:**

```json
{
  "licencaId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "quantidadeUdas": "2.5"
}
```

**Response 201 — Criado:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "licenca": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "numero": "LIC-2026-00042",
    "status": "ATIVA",
    "usuarioMusica": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "razaoSocial": "Rádio Cidade FM Ltda",
      "cnpj": "50997063000132"
    },
    "rubrica": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "sigla": "RFM",
      "nome": "Rádio FM"
    }
  },
  "quantidadeUdas": "2.500000",
  "valorUdaNoMomento": "107.310000",
  "valorBruto": "268.275000",
  "periodo": "2026-04",
  "status": "CONFIRMADO",
  "dataRegistro": "2026-04-05T14:30:00Z",
  "criadoEm": "2026-04-05T14:30:00Z",
  "atualizadoEm": "2026-04-05T14:30:00Z"
}
```

Header: `Location: /api/v1/pagamentos/a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Response 400 — Validação:**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Validation Error",
  "status": 400,
  "detail": "Um ou mais campos são inválidos",
  "errors": [
    {
      "field": "quantidadeUdas",
      "message": "A quantidade de UDAs deve ser maior que zero"
    }
  ]
}
```

**Response 409 — Pagamento duplicado:**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Conflict",
  "status": 409,
  "detail": "Já existe pagamento confirmado para a licença 'LIC-2026-00042' no período 2026-04"
}
```

**Response 422 — Regra de negócio violada:**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Não é possível registrar pagamento para licença com status ENCERRADA"
}
```

Outros exemplos de 422:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Não há valor de UDA vigente para a data atual (2026-04-05)"
}
```

**Notas frontend:** Exibir o valor da UDA vigente (via GET /uda/vigente) e o `valorBruto` calculado previamente (preview) antes da confirmação. Após sucesso, redirecionar para detalhe do pagamento com toast de confirmação. Tratar 409 com mensagem amigável indicando o período conflitante.

**Notas backend:** Sequência de operações na transação: (1) buscar licença por ID — 404 se não encontrada; (2) validar status ATIVA ou SUSPENSA — 422 se ENCERRADA; (3) buscar UDA vigente — 422 se não encontrada; (4) calcular valorBruto = quantidadeUdas × valorUda; (5) persistir pagamento — capturar violação de unique constraint e retornar 409; (6) inserir evento no Outbox. Toda a sequência em uma única transação de banco.

---

### GET /api/v1/pagamentos/{id}

Retorna os dados completos de um pagamento específico com relacionamentos expandidos.

**Path parameter:** `id` (UUID) — ID do pagamento

**Response 200 — Sucesso:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "licenca": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "numero": "LIC-2026-00042",
    "status": "ATIVA",
    "usuarioMusica": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "razaoSocial": "Rádio Cidade FM Ltda",
      "cnpj": "50997063000132"
    },
    "rubrica": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "sigla": "RFM",
      "nome": "Rádio FM"
    }
  },
  "quantidadeUdas": "2.500000",
  "valorUdaNoMomento": "107.310000",
  "valorBruto": "268.275000",
  "periodo": "2026-04",
  "status": "CONFIRMADO",
  "dataRegistro": "2026-04-05T14:30:00Z",
  "criadoEm": "2026-04-05T14:30:00Z",
  "atualizadoEm": "2026-04-05T14:30:00Z"
}
```

**Response 404 — Não encontrado:**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Pagamento com ID 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' não foi encontrado"
}
```

**Notas frontend:** Exibir `valorUdaNoMomento` com rótulo "Valor UDA (na data do registro)" para deixar claro que é histórico. Badge de status: CONFIRMADO (verde), ESTORNADO (vermelho). Botão "Estornar" visível apenas para Analista e quando `status = CONFIRMADO` (funcionalidade F06).

**Notas backend:** JOIN simples com licenca, usuario_musica e rubrica. Nenhuma lógica de negócio — apenas leitura.
