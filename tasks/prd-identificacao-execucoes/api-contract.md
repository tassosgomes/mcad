# API Contract — F04: Identificação de Execuções

> **Gerado a partir de:** `tasks/prd-identificacao-execucoes/prd.md`
> **Data:** 2026-04-04
> **Status:** Rascunho
> **Versão do contrato:** 1.0.0

---

## Premissas e Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Recurso dedicado | `/pendentes` (não sub-recurso de captação) | Tela centralizada cross-captação |
| Resolução individual | `POST /pendentes/{id}/resolver` | Ação explícita por execução |
| Resolução em lote | `POST /pendentes/resolver-lote` | Mesmo ISRC em N captações → resolve todas |
| Visão de impacto | `GET /pendentes/impacto` | Agrupado por ISRC/ISWC com contagem de captações |
| Re-verificação automática | Background job interno (sem endpoint) | Não é ação do usuário |
| Busca no Cadastro | Reutiliza `GET /busca` do Cadastro (F02) | Já existe |

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status Possíveis |
|--------|------|-----------|------|-----------------|
| `GET` | `/api/v1/pendentes` | Listar execuções pendentes com filtros | read | 200, 401, 500 |
| `GET` | `/api/v1/pendentes/impacto` | Visão agrupada por ISRC/ISWC com impacto | read | 200, 401, 500 |
| `POST` | `/api/v1/pendentes/{id}/resolver` | Resolver execução individual | write | 200, 400, 401, 403, 404, 422, 500 |
| `POST` | `/api/v1/pendentes/resolver-lote` | Resolver múltiplas execuções | write | 200, 400, 401, 403, 422, 500 |

---

## Endpoints Detalhados

### `GET /api/v1/pendentes` — Listar execuções pendentes

**Propósito:** Tela centralizada de todos os pendentes do sistema.
**Consumido por:** Frontend — `/identificacao/pendentes`

#### Query Parameters

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `page` | integer | 1 | Página |
| `size` | integer | 20 | Itens por página (máx 100) |
| `captacaoId` | UUID | — | Filtrar por captação |
| `rubricaId` | UUID | — | Filtrar por rubrica |
| `periodoInicio` | date | — | Data inicial |
| `periodoFim` | date | — | Data final |
| `q` | string | — | Buscar por ISRC ou ISWC |
| `sort` | string | `-criadoEm` | Campos: `criadoEm`, `captacao`, `isrc` |

#### Response 200

```json
{
  "data": [
    {
      "id": "e1f2a3b4-5678-90ab-cdef-123456789012",
      "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
      "captacaoRubrica": "TV Aberta",
      "captacaoPeriodo": "2026-01-15",
      "captacaoStatus": "ABERTA",
      "captacaoAnalistaResponsavel": "Maria Silva",
      "obraId": null,
      "fonogramaId": null,
      "obraTitulo": "",
      "fonogramaIsrc": "BRUM99999999",
      "obraIswc": null,
      "interpretes": "",
      "inicio": "14:30:00",
      "fim": "14:33:45",
      "quantidade": 1,
      "status": "PENDENTE",
      "criadoEm": "2026-01-15T14:30:00Z"
    }
  ],
  "pagination": { "page": 1, "size": 20, "total": 45, "totalPages": 3 }
}
```

---

### `GET /api/v1/pendentes/impacto` — Visão de impacto agrupada

**Propósito:** Priorização — quais ISRC/ISWC afetam mais captações.
**Consumido por:** Frontend — aba/view de priorização na tela de pendentes

#### Response 200

```json
{
  "data": [
    {
      "identificador": "BRUM99999999",
      "tipoIdentificador": "isrc",
      "obraTitulo": "",
      "totalExecucoes": 15,
      "totalCaptacoes": 3,
      "captacoes": [
        { "captacaoId": "c1d2...", "rubrica": "TV Aberta", "periodo": "2026-01-15", "execucoesPendentes": 8 },
        { "captacaoId": "c3d4...", "rubrica": "Rádio AM/FM", "periodo": "2026-01-15", "execucoesPendentes": 5 },
        { "captacaoId": "c5d6...", "rubrica": "TV Fechada", "periodo": "2026-01-16", "execucoesPendentes": 2 }
      ]
    }
  ],
  "pagination": { "page": 1, "size": 20, "total": 12, "totalPages": 1 }
}
```

---

### `POST /api/v1/pendentes/{id}/resolver` — Resolver individual

**Propósito:** Vincular uma execução pendente a obra/fonograma LIBERADA.
**Consumido por:** Frontend — botão "Resolver" por linha na tabela

#### Request Body

```json
{
  "obraId": "a1b2c3d4-1111-2222-3333-444444444444",
  "fonogramaId": "f1e2d3c4-5555-6666-7777-888888888888"
}
```

#### Response 200

Execução atualizada com status IDENTIFICADA, título e intérpretes preenchidos do Cadastro.

#### Erros Possíveis

| HTTP | code | Quando ocorre |
|------|------|---------------|
| 403 | `FORBIDDEN` | Usuário não tem role `analista-identificacao` |
| 404 | `NOT_FOUND` | Execução não encontrada |
| 422 | `STATUS_INVALIDO` | Captação da execução não está ABERTA |
| 422 | `OBRA_NAO_LIBERADA` | Obra/fonograma selecionada não está LIBERADA |

---

### `POST /api/v1/pendentes/resolver-lote` — Resolver em lote

**Propósito:** Resolver N execuções pendentes com mesmo ISRC/ISWC de uma vez.
**Consumido por:** Frontend — fluxo "Resolver todas" na visão de impacto

#### Request Body

```json
{
  "execucaoIds": [
    "e1f2a3b4-0001-0000-0000-000000000001",
    "e1f2a3b4-0001-0000-0000-000000000002",
    "e1f2a3b4-0001-0000-0000-000000000003"
  ],
  "obraId": "a1b2c3d4-1111-2222-3333-444444444444",
  "fonogramaId": "f1e2d3c4-5555-6666-7777-888888888888"
}
```

#### Response 200

```json
{
  "resolvidas": 12,
  "rejeitadas": 3,
  "detalhesRejeitadas": [
    { "execucaoId": "e1f2a3b4-0001-0000-0000-000000000010", "motivo": "Captação com status FECHADA" },
    { "execucaoId": "e1f2a3b4-0001-0000-0000-000000000011", "motivo": "Captação com status FECHADA" },
    { "execucaoId": "e1f2a3b4-0001-0000-0000-000000000012", "motivo": "Execução não encontrada" }
  ]
}
```

#### Erros Possíveis

| HTTP | code | Quando ocorre |
|------|------|---------------|
| 400 | `VALIDATION_ERROR` | Lista de IDs vazia |
| 403 | `FORBIDDEN` | Não tem role `analista-identificacao` |
| 422 | `OBRA_NAO_LIBERADA` | Obra/fonograma não LIBERADA (rejeita lote inteiro) |

---

## Schemas de Entidades

### Execução Pendente

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | UUID | Não | ID da execução |
| `captacaoId` | UUID | Não | ID da captação |
| `captacaoRubrica` | string | Não | Nome da rubrica |
| `captacaoPeriodo` | date | Não | Período da captação |
| `captacaoStatus` | string | Não | ABERTA ou FECHADA |
| `captacaoAnalistaResponsavel` | string | Não | Nome do analista dono |
| `obraId` | UUID | Sim | ID da obra (null se ISRC desconhecido) |
| `fonogramaId` | UUID | Sim | ID do fonograma |
| `obraTitulo` | string | Não | Título (snapshot ou vazio) |
| `fonogramaIsrc` | string | Sim | ISRC |
| `obraIswc` | string | Sim | ISWC |
| `interpretes` | string | Não | Intérpretes (snapshot ou vazio) |
| `inicio` | string | Não | HH:mm:ss |
| `fim` | string | Não | HH:mm:ss |
| `quantidade` | integer | Não | Ocorrências |
| `status` | enum | Não | `PENDENTE` |
| `criadoEm` | datetime | Não | ISO 8601 |

### Impacto Pendente (agrupado)

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `identificador` | string | Não | ISRC ou ISWC |
| `tipoIdentificador` | enum | Não | `isrc`, `iswc`, `desconhecido` |
| `obraTitulo` | string | Sim | Título (se disponível) |
| `totalExecucoes` | integer | Não | Execuções pendentes com este ID |
| `totalCaptacoes` | integer | Não | Captações distintas afetadas |
| `captacoes` | array | Não | Resumo por captação |

---

## Códigos de Erro

| HTTP | code | Descrição |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Dados inválidos |
| 401 | `UNAUTHORIZED` | Token inválido |
| 403 | `FORBIDDEN` | Sem role de escrita |
| 404 | `NOT_FOUND` | Execução não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está ABERTA |
| 422 | `OBRA_NAO_LIBERADA` | Obra/fonograma não está LIBERADA |
| 500 | `INTERNAL_ERROR` | Erro interno |

---

## Componente Interno (sem endpoint)

### Re-verificação Automática (Background Job)

O background job `PendentesVerificadorWorker`:
- Roda periodicamente (ex: a cada 5 minutos)
- Busca execuções PENDENTES que **têm obraId** (foram vinculadas a obra PENDENTE/BLOQUEADA)
- Consulta Cadastro por ID para verificar se status mudou para LIBERADO
- Se LIBERADO: atualiza execução → IDENTIFICADA (com título/intérpretes atualizados)
- Batch de IDs únicos (não consulta a mesma obra 2x)
- **Não tem endpoint** — é completamente interno

---

## Questões em Aberto

Todas resolvidas. Contrato pronto para implementação.

---

*Contrato gerado com a skill `flow-contract-creator`. Próximos passos: gerar TechSpec Backend e Frontend.*
