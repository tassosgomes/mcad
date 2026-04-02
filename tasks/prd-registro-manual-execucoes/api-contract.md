# API Contract — F02: Registro Manual de Execuções

> **Gerado a partir de:** `tasks/prd-registro-manual-execucoes/prd.md`
> **Data:** 2026-04-02
> **Status:** Rascunho
> **Versão do contrato:** 1.0.0

---

## Premissas e Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Sub-recurso | `/captacoes/{captacaoId}/execucoes` | Execuções pertencem a uma captação |
| Busca unificada | `GET /cadastro/busca?q=` no Cadastro API | Não existia — endpoint novo |
| Horários | `HH:mm:ss` (string) | Dia já definido na captação (período) |
| Duração | Calculada server-side (fim - início) | Garante consistência |
| Intérpretes | Snapshot (string) no momento do registro | Evita consulta ao Cadastro a cada exibição |
| Tipo de utilização | Referência por ID (FK) | Entidade seed no schema identificacao |
| Status da execução | Automático (IDENTIFICADA/PENDENTE) | Definido pelo match no Cadastro |

---

## Resumo de Endpoints

### Identificação API (`:5100`)

| Método | Path | Descrição | Auth | Status Possíveis |
|--------|------|-----------|------|-----------------|
| `GET` | `/api/v1/tipos-utilizacao` | Listar tipos de utilização (seed) | read | 200, 401, 500 |
| `GET` | `/api/v1/captacoes/{captacaoId}/execucoes` | Listar execuções | read | 200, 401, 404, 500 |
| `POST` | `/api/v1/captacoes/{captacaoId}/execucoes` | Adicionar execução | write | 201, 400, 401, 403, 404, 422, 500 |
| `PUT` | `/api/v1/captacoes/{captacaoId}/execucoes/{id}` | Atualizar execução | write | 200, 400, 401, 403, 404, 422, 500 |
| `DELETE` | `/api/v1/captacoes/{captacaoId}/execucoes/{id}` | Excluir execução | write | 204, 401, 403, 404, 422, 500 |

### Cadastro API (`:5001`) — Endpoint novo

| Método | Path | Descrição | Auth | Status Possíveis |
|--------|------|-----------|------|-----------------|
| `GET` | `/api/v1/cadastro/busca?q=` | Busca unificada (ISRC, ISWC, título, titular) | read | 200, 400, 401, 500 |

---

## Endpoints Detalhados

### `GET /api/v1/tipos-utilizacao` — Listar tipos de utilização

**Propósito:** Seed fixo de 4 tipos (TA, TE, PE, BK) para popular dropdown.
**Consumido por:** Frontend — dropdown no formulário de execução (rubricas audiovisuais)

#### Response 200

```json
{
  "data": [
    { "id": "d1e2f3a4-0001-0000-0000-000000000001", "sigla": "TA", "descricao": "Tema de Abertura", "peso": 1.0 },
    { "id": "d1e2f3a4-0001-0000-0000-000000000002", "sigla": "TE", "descricao": "Tema de Encerramento", "peso": 1.0 },
    { "id": "d1e2f3a4-0001-0000-0000-000000000003", "sigla": "PE", "descricao": "Performance Cênica", "peso": 1.0 },
    { "id": "d1e2f3a4-0001-0000-0000-000000000004", "sigla": "BK", "descricao": "Background (Música de Fundo)", "peso": 0.0833 }
  ]
}
```

---

### `GET /api/v1/captacoes/{captacaoId}/execucoes` — Listar execuções

**Propósito:** Tabela de execuções dentro do detalhe da captação.
**Consumido por:** Frontend — seção "Execuções" na CaptacaoDetailPage

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Default | Descrição |
|-----------|------|-------------|---------|-----------|
| `page` | integer | Não | 1 | Página |
| `size` | integer | Não | 20 | Itens por página (máx 100) |
| `status` | enum | Não | — | `IDENTIFICADA` ou `PENDENTE` |
| `sort` | string | Não | `inicio` | Campos: `inicio`, `titulo`, `criadoEm` |

#### Response 200

```json
{
  "data": [
    {
      "id": "e1f2a3b4-5678-90ab-cdef-123456789012",
      "obraId": "a1b2c3d4-1111-2222-3333-444444444444",
      "fonogramaId": "f1e2d3c4-5555-6666-7777-888888888888",
      "obraTitulo": "Meu Bem Querer",
      "fonogramaIsrc": "BRUM71500001",
      "obraIswc": "T-345.246.800-1",
      "interpretes": "Djavan / Caetano Veloso / Gilberto Gil",
      "inicio": "14:30:00",
      "fim": "14:33:45",
      "duracaoSegundos": 225,
      "quantidade": 1,
      "tipoUtilizacao": {
        "id": "d1e2f3a4-0001-0000-0000-000000000001",
        "sigla": "TA",
        "descricao": "Tema de Abertura",
        "peso": 1.0
      },
      "tituloPrograma": "Novela das 9 - Cap. 142",
      "status": "IDENTIFICADA",
      "criadoEm": "2026-01-15T14:30:00Z",
      "atualizadoEm": "2026-01-15T14:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### `POST /api/v1/captacoes/{captacaoId}/execucoes` — Adicionar execução

**Propósito:** Registrar uma execução musical na captação.
**Consumido por:** Frontend — formulário "Adicionar Execução"

#### Request Body

```json
{
  "obraId": "a1b2c3d4-1111-2222-3333-444444444444",
  "fonogramaId": "f1e2d3c4-5555-6666-7777-888888888888",
  "inicio": "14:30:00",
  "fim": "14:33:45",
  "quantidade": 1,
  "tipoUtilizacaoId": "d1e2f3a4-0001-0000-0000-000000000001",
  "tituloPrograma": "Novela das 9 - Cap. 142"
}
```

#### Response 201

Mesmo schema de `ExecucaoResponse` (com todos os campos expandidos, incluindo intérpretes resolvidos do Cadastro).

#### Erros Possíveis

| HTTP | code | Quando ocorre |
|------|------|---------------|
| 400 | `VALIDATION_ERROR` | Campo obrigatório ausente ou formato inválido |
| 403 | `FORBIDDEN` | Não é o analista dono da captação |
| 404 | `NOT_FOUND` | Captação não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está ABERTA |
| 422 | `TIPO_UTILIZACAO_OBRIGATORIO` | Rubrica audiovisual sem tipo de utilização |
| 422 | `TITULO_PROGRAMA_OBRIGATORIO` | Rubrica audiovisual sem título do programa |
| 422 | `HORARIO_INVALIDO` | Fim anterior ao início |

---

### `PUT /api/v1/captacoes/{captacaoId}/execucoes/{id}` — Atualizar execução

**Propósito:** Editar dados de uma execução. Status recalculado se obra/fonograma mudar.
**Consumido por:** Frontend — formulário de edição inline

#### Request Body

Mesmo schema de `CriarExecucaoRequest`.

#### Response 200

Mesmo schema de `ExecucaoResponse`.

---

### `DELETE /api/v1/captacoes/{captacaoId}/execucoes/{id}` — Excluir execução

**Propósito:** Remover execução individual. Retorna `204 No Content`.

---

### `GET /api/v1/cadastro/busca?q=` — Busca unificada (Cadastro API)

**Propósito:** Autocomplete para campo de seleção de obra/fonograma no formulário de execução.
**Consumido por:** Frontend — componente de busca no formulário
**Servidor:** Cadastro API (`:5001`)

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Default | Descrição |
|-----------|------|-------------|---------|-----------|
| `q` | string | Sim | — | Termo: ISRC, ISWC, título ou titular (min 3 chars) |
| `tipo` | enum | Não | `todos` | `obra`, `fonograma`, `todos` |
| `size` | integer | Não | 20 | Máximo de resultados (máx 50) |

#### Response 200

```json
{
  "resultados": [
    {
      "tipo": "fonograma",
      "id": "f1e2d3c4-5555-6666-7777-888888888888",
      "obraId": "a1b2c3d4-1111-2222-3333-444444444444",
      "titulo": "Meu Bem Querer",
      "isrc": "BRUM71500001",
      "iswc": null,
      "interpretes": "Djavan / Caetano Veloso / Gilberto Gil",
      "status": "LIBERADO"
    },
    {
      "tipo": "obra",
      "id": "a1b2c3d4-1111-2222-3333-444444444444",
      "obraId": null,
      "titulo": "Meu Bem Querer",
      "isrc": null,
      "iswc": "T-345.246.800-1",
      "interpretes": null,
      "status": "LIBERADO"
    }
  ]
}
```

---

## Schemas de Entidades

### Execução

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `id` | UUID | Sim | Não | Identificador único |
| `obraId` | UUID | Sim | Não | Referência à obra no Cadastro |
| `fonogramaId` | UUID | Não | Sim | Referência ao fonograma (quando disponível) |
| `obraTitulo` | string | Sim | Não | Snapshot do título |
| `fonogramaIsrc` | string | Não | Sim | ISRC do fonograma |
| `obraIswc` | string | Não | Sim | ISWC da obra |
| `interpretes` | string | Sim | Não | 3 principais separados por `/` |
| `inicio` | string (HH:mm:ss) | Sim | Não | Horário de início |
| `fim` | string (HH:mm:ss) | Sim | Não | Horário de fim |
| `duracaoSegundos` | integer | Sim | Não | Calculado (fim - início) |
| `quantidade` | integer (≥1) | Sim | Não | Ocorrências |
| `tipoUtilizacao` | TipoUtilizacao | Não | Sim | Obrigatório para audiovisual |
| `tituloPrograma` | string | Não | Sim | Obrigatório para audiovisual |
| `status` | enum | Sim | Não | `IDENTIFICADA`, `PENDENTE` |
| `criadoEm` | datetime | Sim | Não | ISO 8601 |
| `atualizadoEm` | datetime | Sim | Não | ISO 8601 |

### Tipo de Utilização

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `id` | UUID | Sim | Não | Identificador |
| `sigla` | string | Sim | Não | `TA`, `TE`, `PE`, `BK` |
| `descricao` | string | Sim | Não | Descrição legível |
| `peso` | number | Sim | Não | Fator multiplicador (1.0 ou 0.0833) |

### Resultado de Busca (Cadastro)

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `tipo` | enum | Sim | Não | `obra` ou `fonograma` |
| `id` | UUID | Sim | Não | ID no Cadastro |
| `obraId` | UUID | Não | Sim | Obra vinculada (quando fonograma) |
| `titulo` | string | Sim | Não | Título |
| `isrc` | string | Não | Sim | ISRC (fonogramas) |
| `iswc` | string | Não | Sim | ISWC (obras) |
| `interpretes` | string | Não | Sim | Intérpretes (fonogramas) |
| `status` | string | Sim | Não | Status no Cadastro |

---

## Códigos de Erro

| HTTP | code | Descrição |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Campo inválido ou ausente |
| 401 | `UNAUTHORIZED` | Token ausente ou expirado |
| 403 | `FORBIDDEN` | Não é o dono da captação |
| 404 | `NOT_FOUND` | Captação ou execução não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está ABERTA |
| 422 | `TIPO_UTILIZACAO_OBRIGATORIO` | Rubrica audiovisual sem tipo de utilização |
| 422 | `TITULO_PROGRAMA_OBRIGATORIO` | Rubrica audiovisual sem título do programa |
| 422 | `HORARIO_INVALIDO` | Fim anterior ao início |
| 500 | `INTERNAL_ERROR` | Erro interno |

---

## Questões em Aberto

Todas resolvidas. Contrato pronto para implementação.

---

*Contrato gerado com a skill `flow-contract-creator`. Próximos passos: gerar TechSpec Backend e TechSpec Frontend referenciando este contrato.*
