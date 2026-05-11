# Catálogo de Eventos — mcad

Catálogo exaustivo de todos os eventos de domínio publicados e consumidos pelos microsserviços do projeto **mcad**. Serve como fonte da verdade para integrações entre os contextos delimitados (bounded contexts) e como base para o futuro schema-registry.

> **Atualizado em:** 2026-05-10  
> **Padrão de envelope:** CloudEvents 1.0 (`application/cloudevents+json`)  
> **Padrão de entrega:** at-least-once via Transactional Outbox  
> **Broker:** RabbitMQ (topic exchanges)

---

## Sumário

- [Convenções](#convenções)
- [Visão geral por serviço](#visão-geral-por-serviço)
- [Exchanges e bindings](#exchanges-e-bindings)
- [1. Cadastro](#1-cadastro-cadastroevents)
- [2. Identificação](#2-identificação-identificacaoevents)
- [3. Arrecadação](#3-arrecadação-arrecadacaoevents)
- [4. Distribuição](#4-distribuição-distribuicaoevents)
- [5. Identidade (identity-sync)](#5-identidade-identityevents)
- [Matriz de consumo (Pub/Sub)](#matriz-de-consumo-pubsub)
- [Pendências e observações](#pendências-e-observações)

---

## Convenções

- **Nomenclatura:** `{dominio}.{entidade}.{acao}` — todos os event types em minúsculas, separados por ponto, em português (linguagem ubíqua do domínio).
- **Routing key:** igual ao `eventType`.
- **Envelope:** os payloads abaixo representam o campo `data` do envelope CloudEvents. O envelope padrão inclui: `specversion`, `id` (uuid), `source` (urn do serviço produtor), `type` (eventType), `subject` (id da entidade), `time` (ISO-8601), `datacontenttype` (`application/json`) e `data` (payload do domínio).
- **Tipos:** `Guid`/`UUID` serializados como string canônica; `decimal`/`BigDecimal` serializados como string (`toPlainString`); datas como ISO-8601.
- **Outbox:** todos os produtores gravam o evento na tabela `outbox_events` dentro da mesma transação do agregado e um worker em background publica no RabbitMQ (com retry até 10 tentativas).

---

## Visão geral por serviço

| Serviço | Stack | Eventos publicados | Eventos consumidos |
|---|---|---|---|
| `cadastro-api` | .NET 8 | 8 | `identity.user.*` |
| `identificacao-api` | .NET 8 | 2 | `distribuicao.rol.processado`, `identity.user.*` |
| `arrecadacao-api` | Java Spring Boot 3.3 | 3 | `identity.user.*` |
| `distribuicao-api` | Java Spring Boot 3.3 | 1 | `arrecadacao.rubrica.*`, `identity.user.*` |
| `identity-sync-api` | Node.js / TS | 3 | — |
| `bff` | Node.js | — | — |

**Total: 17 tipos de eventos distintos.**

---

## Exchanges e bindings

| Exchange | Tipo | Durable | vhost | Produtor | Consumidores (queue → routing key) |
|---|---|---|---|---|---|
| `cadastro.events` | topic | true | mcad | cadastro-api | — |
| `identificacao.events` | topic | true | mcad | identificacao-api | — |
| `arrecadacao.events` | topic | true | mcad | arrecadacao-api | distribuicao-api (`${app.rabbitmq.queues.rubricas}` → `arrecadacao.rubrica.*`) |
| `distribuicao.events` | topic | true | mcad | distribuicao-api | identificacao-api (`identificacao.distribuicao.rol.processado` → `distribuicao.rol.processado`) |
| `identity.events` | topic | true | mcad | identity-sync-api | cadastro-api (`cadastro.identity.users` → `identity.user.*`); identificacao-api (`identificacao.identity.users` → `identity.user.*`); arrecadacao-api (`${app.identity-events.queue}` → `identity.user.*`); distribuicao-api (`${app.identity-events.queue}` → `identity.user.*`) |

---

## 1. Cadastro (`cadastro.events`)

**Serviço:** `services/cadastro-api/` (.NET 8)  
**Source URI:** `urn:cadastro-api`  
**Outbox:** `cadastro.outbox_events`  
**Documentação AsyncAPI:** servida em `/asyncapi/ui/` pelo próprio serviço (Saunter).

### Eventos publicados

| Event type | Subject | Trigger |
|---|---|---|
| `cadastro.obra.liberada` | `obraId` | `LiberarObraCommandHandler` |
| `cadastro.obra.bloqueada` | `obraId` | `BloquearObraCommandHandler` |
| `cadastro.obra.dominio-publico` | `obraId` | `AlterarDominioPublicoCommandHandler` |
| `cadastro.obra.depurada` | `obraId` | `DepurarObraCommandHandler` |
| `cadastro.fonograma.liberado` | `fonogramaId` | `LiberarFonogramaCommandHandler` |
| `cadastro.fonograma.bloqueado` | `fonogramaId` | `BloquearFonogramaCommandHandler` |
| `cadastro.fonograma.depurado` | `fonogramaId` | `DepurarFonogramaCommandHandler` |
| `cadastro.titular.criado` | `titularId` | `CriarTitularCommandHandler` |

### Payloads (`data`)

#### `cadastro.obra.liberada`
Publicado quando uma obra musical tem seu status alterado para LIBERADA, tornando-a disponível para uso por outros domínios.

```json
{
  "obraId": "uuid",
  "titulo": "string",
  "iswc": "string | null"
}
```

#### `cadastro.obra.bloqueada`
Publicado quando uma obra é bloqueada por irregularidade ou pendência.

```json
{
  "obraId": "uuid",
  "titulo": "string",
  "justificativa": "string"
}
```

#### `cadastro.obra.dominio-publico`
Publicado quando o flag de domínio público de uma obra é alterado.

```json
{
  "obraId": "uuid",
  "titulo": "string",
  "dominioPublico": "boolean"
}
```

#### `cadastro.obra.depurada`
Publicado após depuração de obra duplicada. A obra original é depurada e uma nova obra canônica é criada.

```json
{
  "obraId": "uuid",
  "titulo": "string",
  "iswcOriginal": "string | null",
  "novaObraId": "uuid"
}
```

#### `cadastro.fonograma.liberado`
Publicado quando um fonograma tem seu status alterado para LIBERADO.

```json
{
  "fonogramaId": "uuid",
  "isrc": "string",
  "obraId": "uuid"
}
```

#### `cadastro.fonograma.bloqueado`
Publicado quando um fonograma é bloqueado com justificativa.

```json
{
  "fonogramaId": "uuid",
  "isrc": "string",
  "justificativa": "string"
}
```

#### `cadastro.fonograma.depurado`
Publicado após depuração de fonograma duplicado.

```json
{
  "fonogramaId": "uuid",
  "isrcOriginal": "string",
  "novoFonogramaId": "uuid",
  "obraId": "uuid"
}
```

#### `cadastro.titular.criado`
Publicado quando um novo titular de direitos é cadastrado. `tipo` ∈ {`PF`, `PJ`}; `documento` é CPF formatado (PF) ou CNPJ alfanumérico (PJ).

```json
{
  "titularId": "uuid",
  "nome": "string",
  "tipo": "PF | PJ",
  "documento": "string"
}
```

### Eventos consumidos
- `identity.user.upserted | identity.user.suspended | identity.user.deleted` (ver seção 5)

---

## 2. Identificação (`identificacao.events`)

**Serviço:** `services/identificacao-api/` (.NET 8)  
**Source URI:** `urn:identificacao-api`  
**Outbox:** `identificacao.outbox_events`  
**Documentação AsyncAPI:** servida em `/asyncapi/ui/` (Saunter).

### Eventos publicados

| Event type | Subject | Trigger |
|---|---|---|
| `identificacao.rol.fechado` | `captacaoId` | `FecharRolCommandHandler` |
| `identificacao.rol.cancelado` | `captacaoId` | `CancelarRolCommandHandler` |

### Payloads (`data`)

#### `identificacao.rol.fechado`
Publicado quando um Rol de Execuções é fechado pelo analista. Contém todas as execuções musicais da captação no período. Consumido por Distribuição para iniciar o cálculo de créditos.

```json
{
  "captacaoId": "uuid",
  "rubrica": "string",
  "periodo": "string (YYYY-MM-DD)",
  "fechadoEm": "datetime (ISO-8601)",
  "analistaId": "uuid",
  "execucoes": [
    {
      "obraId": "uuid",
      "fonogramaId": "uuid | null",
      "quantidade": "integer",
      "tipoUtilizacao": "string | null",
      "peso": "decimal | null",
      "inicio": "string (HH:mm:ss) | null",
      "fim": "string (HH:mm:ss) | null",
      "duracaoSegundos": "integer | null"
    }
  ]
}
```

> **Nota:** Os campos `tipoUtilizacao`, `peso`, `inicio`, `fim`, `duracaoSegundos` são populados apenas para rubricas com `exigeClassificacao = true`.

#### `identificacao.rol.cancelado`
Publicado quando uma captação é cancelada pelo analista responsável.

```json
{
  "captacaoId": "uuid",
  "rubrica": "string",
  "periodo": "string (YYYY-MM-DD)",
  "canceladoEm": "datetime (ISO-8601)",
  "analistaId": "uuid",
  "justificativa": "string"
}
```

### Eventos consumidos

- `distribuicao.rol.processado` (exchange `distribuicao.events`, queue `identificacao.distribuicao.rol.processado`) — marca a captação como `DistribuicaoProcessada`. Idempotente.

  ```json
  {
    "captacaoId": "uuid",
    "processadoEm": "datetime (ISO-8601)"
  }
  ```

- `identity.user.*` (ver seção 5).

---

## 3. Arrecadação (`arrecadacao.events`)

**Serviço:** `services/arrecadacao-api/` (Java Spring Boot 3.3)  
**Source URI:** `urn:arrecadacao-api`  
**Outbox:** `arrecadacao.outbox_events`

### Eventos publicados

| Event type | Subject | Trigger |
|---|---|---|
| `arrecadacao.rubrica.criada` | `rubricaId` | `OutboxSeedService` (boot) |
| `arrecadacao.pagamento.registrado` | `pagamentoId` | `RegistrarPagamentoCommandHandler` |
| `arrecadacao.pagamento.estornado` | `pagamentoId` | `EstornarPagamentoCommandHandler` |

### Payloads (`data`)

#### `arrecadacao.rubrica.criada`
Publicado no startup pelo `OutboxSeedService` para cada rúbrica existente que ainda não tenha evento registrado. Permite que outros domínios mantenham uma cópia local das rubricas.

```json
{
  "sigla": "string",
  "nome": "string",
  "exigeClassificacao": "boolean"
}
```

#### `arrecadacao.pagamento.registrado`
Publicado ao registrar pagamento confirmado de uma licença.

```json
{
  "pagamentoId": "uuid",
  "licencaId": "uuid",
  "periodo": "string (YYYY-MM)",
  "quantidadeUdas": "decimal (plain string)",
  "valorUdaNoMomento": "decimal (plain string)",
  "valorBruto": "decimal (plain string)",
  "status": "CONFIRMADO",
  "dataRegistro": "string (YYYY-MM-DD)"
}
```

#### `arrecadacao.pagamento.estornado`
Publicado quando um pagamento confirmado é estornado, com recalcule da verba.

```json
{
  "pagamentoId": "uuid",
  "licencaId": "uuid",
  "rubricaSigla": "string",
  "periodo": "string (YYYY-MM)",
  "quantidadeUdas": "decimal (plain string)",
  "valorEstornado": "decimal (plain string)",
  "justificativa": "string",
  "estornadoPor": "string (username)",
  "estornadoEm": "datetime (ISO-8601)"
}
```

### Eventos consumidos
- `identity.user.*` (ver seção 5).

---

## 4. Distribuição (`distribuicao.events`)

**Serviço:** `services/distribuicao-api/` (Java Spring Boot 3.3)  
**Source URI:** `urn:distribuicao-api`  
**Outbox:** `distribuicao.outbox_events`

### Eventos publicados

| Event type | Subject | Trigger |
|---|---|---|
| `distribuicao.processo.calculado` | `processoId` | `CalcularProcessoCommandHandler` |

### Payloads (`data`)

#### `distribuicao.processo.calculado`
Publicado quando um processo de distribuição é calculado com sucesso (créditos gerados a partir do rol fechado + verba líquida).

```json
{
  "processoId": "uuid",
  "rubricaSigla": "string",
  "periodo": "string (YYYY-MM)",
  "status": "CALCULADO",
  "totalExecucoes": "integer",
  "totalObras": "integer",
  "totalCreditos": "integer",
  "valorTotalCalculado": "decimal (plain string)",
  "calculadoEm": "datetime (ISO-8601)"
}
```

### Eventos consumidos

- `arrecadacao.rubrica.criada` (exchange `arrecadacao.events`, queue `${app.rabbitmq.queues.rubricas}`) — upsert da rúbrica na base local de distribuição. Manipulado por `RubricaEventListener` → `RubricaEventHandler`.

  ```json
  { "sigla": "string", "nome": "string", "exigeClassificacao": "boolean" }
  ```

- `identity.user.*` (ver seção 5).

---

## 5. Identidade (`identity.events`)

**Serviço:** `services/identity-sync-api/` (Node.js + TypeScript)  
**Fonte original:** Webhook do Logto (provedor OIDC externo)  
**Source field:** `provider: 'logto'` + nome do evento Logto original

### Eventos publicados

| Event type | Routing key | Origem (Logto) |
|---|---|---|
| `identity.user.upserted` | `identity.user.upserted` | `User.Created`, `User.Updated`, `User.Data.Updated`, etc. |
| `identity.user.suspended` | `identity.user.suspended` | `User.SuspensionStatus.Updated` com `isSuspended = true` |
| `identity.user.deleted` | `identity.user.deleted` | `User.Deleted` |

> **Atenção:** diferente dos demais, o `identity-sync-api` publica o evento **direto como JSON** (sem envelope CloudEvents estruturado). O `contentType` é `application/json` e o envelope contém o payload completo no nível raiz:

### Payload completo do evento (toda a mensagem)

```json
{
  "eventId": "string (sha256)",
  "eventType": "identity.user.upserted | identity.user.suspended | identity.user.deleted",
  "occurredAt": "datetime (ISO-8601)",
  "source": {
    "provider": "logto",
    "event": "string (nome original do webhook Logto)",
    "hookId": "string | null"
  },
  "user": {
    "logtoUserId": "string",
    "username": "string | null",
    "displayName": "string | null",
    "email": "string | null",
    "avatarUrl": "string | null",
    "roles": ["string"],
    "isSuspended": "boolean",
    "raw": "object (user object completo do Logto)"
  },
  "metadata": {
    "payloadHash": "string (sha256 do body original)"
  }
}
```

### Consumidores

Todos os quatro microsserviços de domínio assinam `identity.user.*` e mantêm uma projeção local da identidade do usuário (`usuarios_identidade` em .NET, `IdentityUserProjection` em Java). A reconciliação inclui papéis e status de suspensão/deleção.

---

## Matriz de consumo (Pub/Sub)

```
┌────────────────────┬───────────────────────────────────────────────────────────┐
│ Produtor           │ Consumidor(es)                                            │
├────────────────────┼───────────────────────────────────────────────────────────┤
│ cadastro-api       │ — (nenhum assinante interno declarado)                    │
│ identificacao-api  │ — (nenhum assinante interno declarado)                    │
│ arrecadacao-api    │ distribuicao-api (rubrica.criada)                         │
│ distribuicao-api   │ identificacao-api (rol.processado — ver pendências)       │
│ identity-sync-api  │ cadastro-api, identificacao-api,                          │
│                    │ arrecadacao-api, distribuicao-api                         │
└────────────────────┴───────────────────────────────────────────────────────────┘
```

---

## Pendências e observações

1. **`distribuicao.rol.processado` — consumidor sem produtor.**  
   O `DistribuicaoEventConsumer` em identificacao-api lê este evento (queue `identificacao.distribuicao.rol.processado`, routing key `distribuicao.rol.processado`), mas **nenhum command handler** do distribuicao-api o publica atualmente. É contrato planejado, possivelmente a ser emitido após a conclusão do pagamento aos titulares (etapa que ainda não existe no código). Tratar como reservado.

2. **Envelope CloudEvents vs JSON puro.**  
   - cadastro / identificacao / arrecadacao / distribuicao: publicam usando CloudEvents 1.0 estruturado (`application/cloudevents+json`), com o payload de domínio dentro de `data`.  
   - identity-sync-api: publica JSON cru (`application/json`); o "payload de domínio" é o objeto raiz inteiro. Os consumidores .NET já tratam ambos os formatos (ver `DistribuicaoEventConsumer.ExtractEventData`).

3. **Eventos sem assinante interno (cadastro.*, identificacao.rol.*, arrecadacao.pagamento.*).**  
   Estes eventos são publicados mas não consumidos por nenhum outro serviço dentro do projeto. Servem hoje como ponto de extensão (BFF/analytics/auditoria externa) e devem ser preservados no contrato público.

4. **Eventos de auditoria.**  
   Em paralelo aos eventos de domínio existe um canal independente de auditoria (`audit.contract` / `audit.sdk`) com `USER_ACTION` e `DATA_CHANGE`, mas ele não trafega via os exchanges de domínio acima e está fora do escopo deste catálogo.

5. **Domain Cancelamento e ciclo de F06 (estorno).**  
   Os eventos `identificacao.rol.cancelado` e `arrecadacao.pagamento.estornado` são complementares: cancelar uma captação invalida fluxos de distribuição associados, e estornar pagamento exige que a verba não esteja "em distribuição" (lock via `VerbaService.validarLockParaEstorno`). Esses dois eventos representam reversões de etapas anteriores e merecem destaque em integrações de compensação.

---

## Próximos passos (schema-registry)

1. Materializar cada payload deste catálogo como `JSON Schema 2020-12` em `infra/schemas/v1/{EventName}.json`, seguindo o padrão do `mini-ecad/mini-ecad-infra/infra/schemas` (envelope CloudEvents com `payload`/`data` como `$ref` interno).
2. Servir os arquivos via nginx (`autoindex on; autoindex_format json;`) sob `/v1/`.
3. Criar `index.html` com explorador (lista + viewer com prism.js) ligando o catálogo (este `events.md`) aos schemas servidos.
4. Versionar mudanças incompatíveis em `/v2/` (mantendo `/v1/` estável até deprecação).
