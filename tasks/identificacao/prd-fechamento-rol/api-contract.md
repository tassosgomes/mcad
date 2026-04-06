# API Contract — F05: Fechamento do Rol

> **Gerado a partir de:** `tasks/prd-fechamento-rol/prd.md`
> **Data:** 2026-04-04
> **Status:** Rascunho
> **Versão do contrato:** 1.0.0

---

## Premissas e Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Validação separada | `GET /captacoes/{id}/pre-requisitos` | Frontend consulta antes de habilitar botão |
| Ação de fechar | `POST /captacoes/{id}/fechar` | Mesmo padrão do Cadastro (`/liberar`, `/bloquear`) |
| Re-validação server-side | Sim, no POST | Não confiar na validação do GET (race conditions) |
| Evento | Outbox Pattern (interno, sem endpoint) | Mesmo padrão do Cadastro F08 |
| Pré-requisitos no erro | Campo `pendencias` no ProblemDetails | Frontend exibe checklist com itens faltantes |

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status Possíveis |
|--------|------|-----------|------|-----------------|
| `GET` | `/api/v1/captacoes/{id}/pre-requisitos` | Checklist de pré-requisitos | read | 200, 401, 404, 500 |
| `POST` | `/api/v1/captacoes/{id}/fechar` | Fechar Rol (irreversível) | write | 200, 401, 403, 404, 422, 500 |

---

## Endpoints Detalhados

### `GET /api/v1/captacoes/{id}/pre-requisitos` — Validar pré-requisitos

**Propósito:** Checklist para o modal de fechamento. Frontend habilita botão somente se `todosAtendidos = true`.
**Consumido por:** Frontend — modal "Fechar Rol" na CaptacaoDetailPage

#### Response 200 (todos atendidos)

```json
{
  "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "todosAtendidos": true,
  "itens": [
    { "id": "min_execucoes", "descricao": "Ao menos 1 execução registrada", "atendido": true, "detalhe": null },
    { "id": "zero_pendentes", "descricao": "Nenhuma execução pendente de identificação", "atendido": true, "detalhe": null },
    { "id": "obras_liberadas", "descricao": "Todas as obras/fonogramas liberadas no Cadastro", "atendido": true, "detalhe": null },
    { "id": "classificacao", "descricao": "Todas as execuções com tipo de utilização", "atendido": true, "detalhe": null },
    { "id": "horarios", "descricao": "Todas as execuções com início e fim", "atendido": true, "detalhe": null }
  ],
  "resumo": {
    "totalExecucoes": 150,
    "identificadas": 150,
    "pendentes": 0,
    "rubrica": "TV Aberta",
    "periodo": "2026-01-15",
    "exigeClassificacao": true
  }
}
```

#### Response 200 (com problemas)

```json
{
  "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "todosAtendidos": false,
  "itens": [
    { "id": "min_execucoes", "descricao": "Ao menos 1 execução registrada", "atendido": true, "detalhe": null },
    { "id": "zero_pendentes", "descricao": "Nenhuma execução pendente de identificação", "atendido": false, "detalhe": "3 execuções pendentes de identificação" },
    { "id": "obras_liberadas", "descricao": "Todas as obras/fonogramas liberadas no Cadastro", "atendido": true, "detalhe": null },
    { "id": "classificacao", "descricao": "Todas as execuções com tipo de utilização", "atendido": false, "detalhe": "5 execuções sem tipo de utilização" },
    { "id": "horarios", "descricao": "Todas as execuções com início e fim", "atendido": true, "detalhe": null }
  ],
  "resumo": {
    "totalExecucoes": 150,
    "identificadas": 147,
    "pendentes": 3,
    "rubrica": "TV Aberta",
    "periodo": "2026-01-15",
    "exigeClassificacao": true
  }
}
```

> **Nota:** Para rubricas não-audiovisuais (Rádio, Streaming Áudio, Show), os itens `classificacao` e `horarios` não aparecem na lista.

---

### `POST /api/v1/captacoes/{id}/fechar` — Fechar Rol

**Propósito:** Ação irreversível que fecha o Rol e publica evento para Distribuição.
**Consumido por:** Frontend — botão "Confirmar Fechamento" no modal

#### Response 200

```json
{
  "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "status": "FECHADA",
  "fechadoEm": "2026-01-15T18:30:00Z",
  "totalExecucoes": 150,
  "eventoPublicado": true
}
```

#### Erros Possíveis

| HTTP | code | Quando ocorre |
|------|------|---------------|
| 403 | `FORBIDDEN` | Não é o analista dono (RN-08) |
| 404 | `NOT_FOUND` | Captação não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está ABERTA |
| 422 | `SEM_EXECUCOES` | Captação sem execuções |
| 422 | `EXECUCOES_PENDENTES` | Há execuções PENDENTES |
| 422 | `OBRAS_NAO_LIBERADAS` | Obras/fonogramas não LIBERADAS no Cadastro |
| 422 | `CLASSIFICACAO_INCOMPLETA` | Audiovisual sem tipo de utilização |
| 422 | `HORARIO_INCOMPLETO` | Audiovisual sem início/fim |

> O erro 422 inclui campo `pendencias` com a lista de itens não atendidos (mesma estrutura do GET pré-requisitos).

---

## Schemas

### PreRequisitoItem

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | string | Não | Identificador: `min_execucoes`, `zero_pendentes`, `obras_liberadas`, `classificacao`, `horarios` |
| `descricao` | string | Não | Texto legível |
| `atendido` | boolean | Não | ✅ ou ❌ |
| `detalhe` | string | Sim | Detalhe do problema (quando não atendido) |

### ResumoFechamento

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `totalExecucoes` | integer | Não | Total de execuções na captação |
| `identificadas` | integer | Não | Execuções IDENTIFICADAS |
| `pendentes` | integer | Não | Execuções PENDENTES |
| `rubrica` | string | Não | Nome da rubrica |
| `periodo` | date | Não | Data da captação |
| `exigeClassificacao` | boolean | Não | Se rubrica é audiovisual |

### FechamentoResponse

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `captacaoId` | UUID | Não | ID da captação |
| `status` | enum | Não | `FECHADA` |
| `fechadoEm` | datetime | Não | Momento do fechamento |
| `totalExecucoes` | integer | Não | Total no Rol |
| `eventoPublicado` | boolean | Não | Evento salvo no outbox |

---

## Evento Interno (sem endpoint)

### `identificacao.rol.fechado` — Outbox Pattern

Publicado via Outbox Worker no RabbitMQ após fechamento. Payload:

```json
{
  "specversion": "1.0",
  "type": "identificacao.rol.fechado",
  "source": "/identificacao/captacoes/c1d2e3f4-5678-90ab-cdef-123456789012",
  "subject": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "time": "2026-01-15T18:30:00Z",
  "data": {
    "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
    "rubrica": "TV_ABERTA",
    "periodo": "2026-01-15",
    "fechadoEm": "2026-01-15T18:30:00Z",
    "analistaId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "execucoes": [
      {
        "obraId": "a1b2c3d4-1111-2222-3333-444444444444",
        "fonogramaId": "f1e2d3c4-5555-6666-7777-888888888888",
        "quantidade": 2,
        "tipoUtilizacao": "TA",
        "peso": 1.0,
        "inicio": "14:30:00",
        "fim": "14:33:45",
        "duracaoSegundos": 225
      },
      {
        "obraId": "b2c3d4e5-2222-3333-4444-555555555555",
        "fonogramaId": null,
        "quantidade": 1,
        "tipoUtilizacao": "BK",
        "peso": 0.0833,
        "inicio": "15:00:00",
        "fim": "15:02:30",
        "duracaoSegundos": 150
      }
    ]
  }
}
```

**Payload para rubrica não-audiovisual (ex: Rádio):**

```json
{
  "data": {
    "captacaoId": "...",
    "rubrica": "RADIO",
    "periodo": "2026-01-15",
    "fechadoEm": "...",
    "analistaId": "...",
    "execucoes": [
      {
        "obraId": "a1b2c3d4-1111-2222-3333-444444444444",
        "fonogramaId": "f1e2d3c4-5555-6666-7777-888888888888",
        "quantidade": 3,
        "tipoUtilizacao": null,
        "peso": null,
        "inicio": null,
        "fim": null,
        "duracaoSegundos": null
      }
    ]
  }
}
```

> **Audiovisual:** leva tempo (início/fim/duração) + classificação (tipo/peso)
> **Áudio:** leva somente quantidade (demais campos null)

---

## Códigos de Erro

| HTTP | code | Descrição |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Token inválido |
| 403 | `FORBIDDEN` | Não é o dono da captação |
| 404 | `NOT_FOUND` | Captação não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está ABERTA |
| 422 | `SEM_EXECUCOES` | Zero execuções |
| 422 | `EXECUCOES_PENDENTES` | Há execuções PENDENTES |
| 422 | `OBRAS_NAO_LIBERADAS` | Obras/fonogramas não LIBERADAS |
| 422 | `CLASSIFICACAO_INCOMPLETA` | Audiovisual sem tipo utilização |
| 422 | `HORARIO_INCOMPLETO` | Audiovisual sem início/fim |
| 500 | `INTERNAL_ERROR` | Erro interno |

---

## Questões em Aberto

Todas resolvidas. Contrato pronto para implementação.

---

*Contrato gerado com a skill `flow-contract-creator`. Próximo passo: API Contract da F06 ou TechSpec.*
