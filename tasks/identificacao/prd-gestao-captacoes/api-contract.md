# API Contract — F01: Gestão de Captações

> **Gerado a partir de:** `tasks/prd-gestao-captacoes/prd.md`
> **Data:** 2026-06-20
> **Status:** Rascunho
> **Versão do contrato:** 1.0.1

---

## Premissas e Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Autenticação | JWT Bearer (Keycloak) | Mesmo padrão do Cadastro |
| Paginação | page/size (1-indexed) | Consistência com API do Cadastro |
| Formato de datas | ISO 8601 UTC (datetime) / `YYYY-MM-DD` (date) | Padrão do projeto |
| Nomenclatura de campos | camelCase | Consistência com API do Cadastro |
| Versionamento | Prefixo `/api/v1/` | Consistência com API do Cadastro |
| Formato de erros | RFC 7807 ProblemDetails | Consistência com API do Cadastro |
| Sorting | Prefixo `-` para DESC | Consistência com API do Cadastro |
| Verbo de atualização | PUT (atualização completa) | Mesmo padrão do Cadastro |
| Roles Keycloak | `analista-identificacao` (write), `consultor-identificacao` (read) | Separação por domínio |
| Usuário de música | `usuarioMusicaId` + `usuarioMusicaNome` | Referência ao usuário de música da Arrecadação com snapshot do nome |

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status Possíveis |
|--------|------|-----------|------|-----------------|
| `GET` | `/api/v1/rubricas` | Listar rubricas (seed fixo) | read | 200, 401, 500 |
| `GET` | `/api/v1/captacoes` | Listar captações com filtros | read | 200, 401, 500 |
| `POST` | `/api/v1/captacoes` | Criar captação | write | 201, 400, 401, 403, 409, 500 |
| `GET` | `/api/v1/captacoes/{id}` | Buscar captação por ID | read | 200, 401, 404, 500 |
| `PUT` | `/api/v1/captacoes/{id}` | Atualizar captação ABERTA | write | 200, 400, 401, 403, 404, 409, 422, 500 |
| `DELETE` | `/api/v1/captacoes/{id}` | Excluir captação ABERTA | write | 204, 401, 403, 404, 422, 500 |

---

## Endpoints Detalhados

### `GET /api/v1/rubricas` — Listar rubricas disponíveis

**Propósito:** Retornar as 7 rubricas do sistema (seed fixo). Usado para popular dropdowns.
**Consumido por:** Frontend — dropdown de criação/edição de captação

#### Response 200

```json
{
  "data": [
    {
      "id": "b1a2c3d4-0001-0000-0000-000000000001",
      "sigla": "RADIO",
      "nome": "Rádio AM/FM",
      "exigeClassificacao": false
    },
    {
      "id": "b1a2c3d4-0001-0000-0000-000000000002",
      "sigla": "TV_ABERTA",
      "nome": "TV Aberta",
      "exigeClassificacao": true
    },
    {
      "id": "b1a2c3d4-0001-0000-0000-000000000003",
      "sigla": "TV_FECHADA",
      "nome": "TV Fechada",
      "exigeClassificacao": true
    },
    {
      "id": "b1a2c3d4-0001-0000-0000-000000000004",
      "sigla": "CINEMA",
      "nome": "Cinema",
      "exigeClassificacao": true
    },
    {
      "id": "b1a2c3d4-0001-0000-0000-000000000005",
      "sigla": "VOD",
      "nome": "Streaming Vídeo (VOD)",
      "exigeClassificacao": true
    },
    {
      "id": "b1a2c3d4-0001-0000-0000-000000000006",
      "sigla": "STREAMING_AUDIO",
      "nome": "Streaming Áudio",
      "exigeClassificacao": false
    },
    {
      "id": "b1a2c3d4-0001-0000-0000-000000000007",
      "sigla": "SHOW",
      "nome": "Show",
      "exigeClassificacao": false
    }
  ]
}
```

> **Nota frontend:** Carregar uma vez e cachear no cliente — dados estáticos.

---

### `GET /api/v1/captacoes` — Listar captações

**Propósito:** Listagem paginada com filtros para todos os usuários.
**Consumido por:** Frontend — tela principal de captações

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Default | Descrição |
|-----------|------|-------------|---------|-----------|
| `page` | integer | Não | 1 | Número da página |
| `size` | integer | Não | 20 | Itens por página (máx 100) |
| `rubricaId` | UUID | Não | — | Filtrar por rubrica |
| `periodoInicio` | date | Não | — | Data inicial (inclusive) |
| `periodoFim` | date | Não | — | Data final (inclusive) |
| `status` | enum | Não | — | `ABERTA`, `FECHADA`, `CANCELADA` |
| `analistaResponsavelId` | UUID | Não | — | Filtrar por analista |
| `sort` | string | Não | `-periodo` | Campos: `periodo`, `criadoEm`, `rubrica`. Prefixo `-` para DESC |

#### Response 200

```json
{
  "data": [
    {
      "id": "c1d2e3f4-5678-90ab-cdef-123456789012",
      "rubrica": {
        "id": "b1a2c3d4-0001-0000-0000-000000000002",
        "sigla": "TV_ABERTA",
        "nome": "TV Aberta",
        "exigeClassificacao": true
      },
      "periodo": "2026-01-15",
      "usuarioMusicaId": "d4e5f6a7-1111-2222-3333-444444444444",
      "usuarioMusicaNome": "TV Globo - Rede Nacional",
      "status": "ABERTA",
      "analistaResponsavel": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "nome": "Maria Silva"
      },
      "criadoEm": "2026-01-15T09:30:00Z",
      "atualizadoEm": "2026-01-15T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 85,
    "totalPages": 5
  }
}
```

---

### `POST /api/v1/captacoes` — Criar captação

**Propósito:** Criar uma nova captação com status ABERTA.
**Consumido por:** Frontend — formulário de criação

#### Request Body

```json
{
  "rubricaId": "b1a2c3d4-0001-0000-0000-000000000002",
  "periodo": "2026-01-15",
  "usuarioMusicaId": "d4e5f6a7-1111-2222-3333-444444444444",
  "usuarioMusicaNome": "TV Globo - Rede Nacional"
}
```

> Payloads legados com `usuarioDeMusica` texto livre não são mais aceitos. A API deve responder `400 Bad Request` quando `usuarioMusicaId` ou `usuarioMusicaNome` estiverem ausentes.

#### Response 201

```json
{
  "id": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "rubrica": {
    "id": "b1a2c3d4-0001-0000-0000-000000000002",
    "sigla": "TV_ABERTA",
    "nome": "TV Aberta",
    "exigeClassificacao": true
  },
  "periodo": "2026-01-15",
  "usuarioMusicaId": "d4e5f6a7-1111-2222-3333-444444444444",
  "usuarioMusicaNome": "TV Globo - Rede Nacional",
  "status": "ABERTA",
  "analistaResponsavel": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "nome": "Maria Silva"
  },
  "criadoEm": "2026-01-15T09:30:00Z",
  "atualizadoEm": "2026-01-15T09:30:00Z"
}
```

#### Erros Possíveis

| Código HTTP | code | Quando ocorre |
|-------------|------|---------------|
| 400 | `VALIDATION_ERROR` | Campo obrigatório ausente ou formato inválido |
| 403 | `FORBIDDEN` | Usuário não tem role `analista-identificacao` |
| 409 | `CAPTACAO_DUPLICADA` | Já existe captação ativa (ABERTA ou FECHADA) para rubrica + período (RN-01) |

---

### `GET /api/v1/captacoes/{id}` — Buscar captação por ID

**Propósito:** Detalhe completo de uma captação, incluindo resumo de execuções.
**Consumido por:** Frontend — tela de detalhe da captação

#### Path Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | Identificador único da captação |

#### Response 200

```json
{
  "id": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "rubrica": {
    "id": "b1a2c3d4-0001-0000-0000-000000000002",
    "sigla": "TV_ABERTA",
    "nome": "TV Aberta",
    "exigeClassificacao": true
  },
  "periodo": "2026-01-15",
  "usuarioMusicaId": "d4e5f6a7-1111-2222-3333-444444444444",
  "usuarioMusicaNome": "TV Globo - Rede Nacional",
  "status": "ABERTA",
  "analistaResponsavel": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "nome": "Maria Silva"
  },
  "resumoExecucoes": {
    "total": 150,
    "identificadas": 142,
    "pendentes": 8
  },
  "criadoEm": "2026-01-15T09:30:00Z",
  "atualizadoEm": "2026-01-15T14:22:00Z"
}
```

> **Nota:** O `resumoExecucoes` só aparece neste endpoint (detalhe), não na listagem.

---

### `PUT /api/v1/captacoes/{id}` — Atualizar captação

**Propósito:** Editar dados de uma captação ABERTA. Somente o dono pode editar.
**Consumido por:** Frontend — formulário de edição

#### Request Body

```json
{
  "rubricaId": "b1a2c3d4-0001-0000-0000-000000000002",
  "periodo": "2026-01-16",
  "usuarioMusicaId": "d4e5f6a7-1111-2222-3333-444444444444",
  "usuarioMusicaNome": "TV Globo - Filial SP"
}
```

#### Response 200

Mesmo schema de `POST` (retorna a captação atualizada).

#### Erros Possíveis

| Código HTTP | code | Quando ocorre |
|-------------|------|---------------|
| 400 | `VALIDATION_ERROR` | Campo inválido ou ausente |
| 403 | `FORBIDDEN` | Usuário não é o analista responsável (RN-08) |
| 404 | `NOT_FOUND` | Captação não encontrada |
| 409 | `CAPTACAO_DUPLICADA` | Nova combinação rubrica+período já existe em outra captação ativa (RN-01) |
| 409 | `RUBRICA_BLOQUEADA` | Tentativa de alterar rubrica de captação com execuções vinculadas |
| 422 | `STATUS_INVALIDO` | Captação não está no estado ABERTA |

---

### `DELETE /api/v1/captacoes/{id}` — Excluir captação

**Propósito:** Remover captação ABERTA e suas execuções. Sem publicação de evento.
**Consumido por:** Frontend — botão de exclusão na tela de detalhe/listagem

**Nota:** Retorna `204 No Content` — sem body na response.

#### Erros Possíveis

| Código HTTP | code | Quando ocorre |
|-------------|------|---------------|
| 403 | `FORBIDDEN` | Usuário não é o analista responsável (RN-08) |
| 404 | `NOT_FOUND` | Captação não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está no estado ABERTA. Para fechadas, usar cancelamento (F06) |

---

## Schemas de Entidades

### Rubrica

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `id` | UUID | Sim | Nao | Identificador único |
| `sigla` | string | Sim | Nao | Código curto: `RADIO`, `TV_ABERTA`, `TV_FECHADA`, `CINEMA`, `VOD`, `STREAMING_AUDIO`, `SHOW` |
| `nome` | string | Sim | Nao | Nome legível da rubrica |
| `exigeClassificacao` | boolean | Sim | Nao | Se `true`, execuções devem ter tipo de utilização |

### Captação

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `id` | UUID | Sim | Nao | Identificador único |
| `rubrica` | Rubrica | Sim | Nao | Rubrica associada (objeto expandido) |
| `periodo` | date | Sim | Nao | Data da captação (`YYYY-MM-DD`) |
| `usuarioMusicaId` | UUID | Sim | Nao | Identificador do usuário de música na Arrecadação |
| `usuarioMusicaNome` | string | Sim | Nao | Snapshot do nome/razão social do usuário de música (máx 200 chars) |
| `status` | enum | Sim | Nao | `ABERTA`, `FECHADA`, `CANCELADA` |
| `analistaResponsavel` | AnalistaResumo | Sim | Nao | Analista dono da captação |
| `criadoEm` | datetime | Sim | Nao | Data de criação (ISO 8601) |
| `atualizadoEm` | datetime | Sim | Nao | Última atualização (ISO 8601) |

### Captação Detalhe (extends Captação)

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `resumoExecucoes` | ResumoExecucoes | Sim | Nao | Contadores de execuções |

### Analista Resumo

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `id` | UUID | Sim | Nao | ID do usuário no Keycloak |
| `nome` | string | Sim | Nao | Nome do analista |

### Resumo Execuções

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `total` | integer | Sim | Nao | Total de execuções na captação |
| `identificadas` | integer | Sim | Nao | Execuções com match no Cadastro |
| `pendentes` | integer | Sim | Nao | Execuções pendentes de identificação |

---

## Códigos de Erro

| HTTP | code | Descrição |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Campo inválido ou ausente |
| 401 | `UNAUTHORIZED` | Token ausente, inválido ou expirado |
| 403 | `FORBIDDEN` | Sem permissão (role ou propriedade) |
| 404 | `NOT_FOUND` | Recurso não encontrado |
| 409 | `CAPTACAO_DUPLICADA` | Já existe captação ativa para rubrica + período |
| 409 | `RUBRICA_BLOQUEADA` | Rubrica não pode ser alterada com execuções existentes |
| 422 | `STATUS_INVALIDO` | Operação incompatível com o status atual |
| 500 | `INTERNAL_ERROR` | Erro interno — verificar `traceId` nos logs |

### Formato Padrão de Erro (RFC 7807)

```json
{
  "type": "https://tools.ietf.org/html/rfc7807#section-6.5.8",
  "title": "Conflict",
  "status": 409,
  "detail": "Já existe uma captação ativa para TV Aberta em 2026-01-15",
  "code": "CAPTACAO_DUPLICADA",
  "traceId": null
}
```

---

## Questões em Aberto

Todas as questões foram resolvidas. Contrato pronto para implementação.

---

## Como usar este contrato

### Backend
Implemente os endpoints exatamente conforme descrito. Use `x-backend-notes` no YAML para hints de implementação.

### Frontend
1. Use os schemas para gerar tipos TypeScript:
   ```bash
   npx openapi-typescript api-contract.yaml -o src/types/identificacao-api.ts
   ```
2. Use o Prism para mockar a API durante desenvolvimento:
   ```bash
   npx @stoplight/prism-cli mock api-contract.yaml
   # API mock disponível em http://localhost:4010
   ```

### Testes de Contrato
```bash
npx dredd api-contract.yaml http://localhost:5100
```

---

*Contrato gerado com a skill `flow-contract-creator`. Próximos passos: gerar TechSpec Backend e TechSpec Frontend referenciando este contrato.*
