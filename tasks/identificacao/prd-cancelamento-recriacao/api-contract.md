# API Contract — F06: Cancelamento e Recriação

> **Gerado a partir de:** `tasks/prd-cancelamento-recriacao/prd.md`
> **Data:** 2026-04-04
> **Status:** Rascunho
> **Versão do contrato:** 1.0.0

---

## Premissas e Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Ação de cancelar | `POST /captacoes/{id}/cancelar` | Mesmo padrão de ações do Cadastro |
| Opção de recriação | No body do POST (não endpoint separado) | Ação atômica: cancelar + recriar na mesma request |
| Verificação prévia | `GET /captacoes/{id}/pode-cancelar` | Frontend habilita/desabilita botão |
| Justificativa | Min 10 chars, max 1000 | Garante qualidade da justificativa |
| Consumer de evento | Interno (sem endpoint) | `distribuicao.rol.processado` processado por worker |

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status Possíveis |
|--------|------|-----------|------|-----------------|
| `GET` | `/api/v1/captacoes/{id}/pode-cancelar` | Verificar se pode cancelar | read | 200, 401, 404, 500 |
| `POST` | `/api/v1/captacoes/{id}/cancelar` | Cancelar + opção de recriação | write | 200, 400, 401, 403, 404, 422, 500 |

---

## Endpoints Detalhados

### `GET /api/v1/captacoes/{id}/pode-cancelar` — Verificar

**Propósito:** Checar se o Rol pode ser cancelado (não processado pela Distribuição).
**Consumido por:** Frontend — ao carregar detalhe de captação FECHADA

#### Response 200 (pode cancelar)

```json
{
  "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "podeCancelar": true,
  "motivo": null,
  "distribuicaoProcessada": false,
  "distribuicaoProcessadaEm": null
}
```

#### Response 200 (não pode)

```json
{
  "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "podeCancelar": false,
  "motivo": "Este Rol já foi processado pela Distribuição",
  "distribuicaoProcessada": true,
  "distribuicaoProcessadaEm": "2026-01-16T02:00:00Z"
}
```

---

### `POST /api/v1/captacoes/{id}/cancelar` — Cancelar Rol

**Propósito:** Cancelar Rol fechado com justificativa e opção de recriação.
**Consumido por:** Frontend — modal de cancelamento na CaptacaoDetailPage

#### Request Body

```json
{
  "justificativa": "Execuções da faixa horária 14h-15h foram registradas com tipo de utilização incorreto (BK em vez de TA)",
  "opcaoRecriacao": "COPIAR_EXECUCOES"
}
```

**Opções de recriação:**

| Opção | Descrição |
|-------|-----------|
| `COPIAR_EXECUCOES` | Nova captação ABERTA com execuções copiadas (novos IDs, status recalculado) |
| `RECRIAR_VAZIA` | Nova captação ABERTA para mesma rubrica+período, sem execuções |
| `APENAS_CANCELAR` | Nenhuma nova captação — analista cria depois manualmente |

#### Response 200 (com recriação)

```json
{
  "captacaoCanceladaId": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "status": "CANCELADA",
  "justificativa": "Execuções da faixa horária 14h-15h foram registradas com tipo de utilização incorreto",
  "canceladoEm": "2026-01-16T09:00:00Z",
  "opcaoRecriacao": "COPIAR_EXECUCOES",
  "novaCaptacaoId": "d2e3f4a5-6789-0abc-def1-234567890123",
  "execucoesCopiadas": 150,
  "eventoPublicado": true
}
```

#### Response 200 (apenas cancelar)

```json
{
  "captacaoCanceladaId": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "status": "CANCELADA",
  "justificativa": "Cancelamento para reclassificação completa",
  "canceladoEm": "2026-01-16T09:00:00Z",
  "opcaoRecriacao": "APENAS_CANCELAR",
  "novaCaptacaoId": null,
  "execucoesCopiadas": null,
  "eventoPublicado": true
}
```

#### Erros Possíveis

| HTTP | code | Quando ocorre |
|------|------|---------------|
| 400 | `VALIDATION_ERROR` | Justificativa vazia ou < 10 chars |
| 403 | `FORBIDDEN` | Não é o analista dono (RN-08) |
| 404 | `NOT_FOUND` | Captação não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está FECHADA |
| 422 | `DISTRIBUICAO_PROCESSADA` | Distribuição já processou o Rol |

---

## Eventos

### Produz: `identificacao.rol.cancelado` (Outbox)

```json
{
  "specversion": "1.0",
  "type": "identificacao.rol.cancelado",
  "source": "/identificacao/captacoes/c1d2e3f4-5678-90ab-cdef-123456789012",
  "subject": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "time": "2026-01-16T09:00:00Z",
  "data": {
    "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
    "rubrica": "TV_ABERTA",
    "periodo": "2026-01-15",
    "canceladoEm": "2026-01-16T09:00:00Z",
    "analistaId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "justificativa": "Execuções com tipo de utilização incorreto"
  }
}
```

### Consome: `distribuicao.rol.processado` (Worker interno)

Ao receber, marca `distribuicaoProcessada = true` na captação, bloqueando cancelamento.

```json
{
  "type": "distribuicao.rol.processado",
  "data": {
    "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
    "processadoEm": "2026-01-16T02:00:00Z"
  }
}
```

---

## Schemas

### CancelarRolRequest

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `justificativa` | string (10-1000) | Sim | Motivo do cancelamento |
| `opcaoRecriacao` | enum | Sim | `COPIAR_EXECUCOES`, `RECRIAR_VAZIA`, `APENAS_CANCELAR` |

### CancelamentoResponse

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `captacaoCanceladaId` | UUID | Não | ID da captação cancelada |
| `status` | enum | Não | `CANCELADA` |
| `justificativa` | string | Não | Motivo |
| `canceladoEm` | datetime | Não | Momento do cancelamento |
| `opcaoRecriacao` | enum | Não | Opção escolhida |
| `novaCaptacaoId` | UUID | Sim | ID da nova captação (null se APENAS_CANCELAR) |
| `execucoesCopiadas` | integer | Sim | Quantidade copiada (somente COPIAR_EXECUCOES) |
| `eventoPublicado` | boolean | Não | Evento salvo no outbox |

### PodeCancelarResponse

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `captacaoId` | UUID | Não | ID da captação |
| `podeCancelar` | boolean | Não | Se pode cancelar |
| `motivo` | string | Sim | Motivo quando não pode |
| `distribuicaoProcessada` | boolean | Não | Flag de processamento |
| `distribuicaoProcessadaEm` | datetime | Sim | Data do processamento |

---

## Códigos de Erro

| HTTP | code | Descrição |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Justificativa inválida |
| 401 | `UNAUTHORIZED` | Token inválido |
| 403 | `FORBIDDEN` | Não é o dono da captação |
| 404 | `NOT_FOUND` | Captação não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está FECHADA |
| 422 | `DISTRIBUICAO_PROCESSADA` | Distribuição já processou |
| 500 | `INTERNAL_ERROR` | Erro interno |

---

## Questões em Aberto

Todas resolvidas. Contrato pronto para implementação.

---

*Contrato gerado com a skill `flow-contract-creator`. Próximo passo: TechSpec Backend e Frontend.*
