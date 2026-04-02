# PRD — F08: Eventos de Cadastro

> **Domínio:** Cadastro (D01)
> **Feature ID:** F08
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-01

---

## Visão Geral

Eventos de Cadastro é a feature que conecta o domínio Cadastro aos demais domínios do mini-ECAD — Identificação, Distribuição e Analytics. Cada mudança relevante de estado (liberação, bloqueio, depuração, criação de titular) é publicada como evento no RabbitMQ no formato **CloudEvents**, permitindo que consumers futuros reajam sem acoplamento direto.

A publicação usa **Outbox Pattern** para garantia transacional: o evento é salvo na tabela `outbox` na mesma transação da entidade, e um worker background lê a outbox e publica no RabbitMQ (at-least-once delivery). Isso elimina o risco de perder eventos por falha entre o SaveChanges e a publicação.

Esta feature é **100% backend** — sem impacto no frontend.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Eventos publicados para todas as transições relevantes | 8 tipos de evento cobrindo obra, fonograma e titular |
| Garantia transacional (sem perda de eventos) | Outbox Pattern: evento + entidade na mesma transação |
| Formato padrão interoperável | 100% dos eventos em CloudEvents 1.0 |
| Desacoplamento entre domínios | Zero dependências diretas — comunicação via broker |

---

## Histórias de Usuário

### HU-01 — Domínio de Identificação recebe fonograma liberado
**Como** domínio de Identificação (consumer futuro),
**eu preciso** receber o evento `cadastro.fonograma.liberado` quando um fonograma é liberado,
**para que** eu possa incluí-lo na base de identificação de execuções.

### HU-02 — Analytics recebe todas as transições
**Como** domínio de Analytics (consumer futuro),
**eu preciso** receber eventos de todas as transições relevantes do Cadastro,
**para que** eu possa alimentar dashboards e read models sem consultar o banco do Cadastro.

### HU-03 — Distribuição sabe quando obra foi depurada
**Como** domínio de Distribuição (consumer futuro),
**eu preciso** receber o evento `cadastro.obra.depurada` com referência à nova obra,
**para que** eu possa atualizar meus vínculos sem consultar diretamente o Cadastro.

---

## Funcionalidades Principais

### 1. Eventos Publicados

| # | Evento | Trigger | Payload Principal |
|---|--------|---------|-------------------|
| RF-01 | `cadastro.obra.liberada` | Obra transiciona para LIBERADO (F07 LiberarObra) | obraId, titulo, iswc |
| RF-02 | `cadastro.obra.bloqueada` | Obra é bloqueada (F07 BloquearObra) | obraId, titulo, justificativa |
| RF-03 | `cadastro.obra.dominio-publico` | Obra marcada como DP (F03 AlterarDominioPublico) | obraId, titulo, dominioPublico (bool) |
| RF-04 | `cadastro.obra.depurada` | Obra é depurada (F03 DepurarObra) | obraId, titulo, iswcOriginal, novaObraId |
| RF-05 | `cadastro.fonograma.liberado` | Fonograma transiciona para LIBERADO (F07 LiberarFonograma) | fonogramaId, isrc, obraId |
| RF-06 | `cadastro.fonograma.depurado` | Fonograma é depurado (F05 DepurarFonograma) | fonogramaId, isrcOriginal, novoFonogramaId, obraId |
| RF-07 | `cadastro.fonograma.bloqueado` | Fonograma é bloqueado (F07 BloquearFonograma) | fonogramaId, isrc, justificativa |
| RF-08 | `cadastro.titular.criado` | Novo titular cadastrado (F02 CriarTitular) | titularId, nome, tipo (PF/PJ), documento |

### 2. Formato CloudEvents

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-09 | Todos os eventos seguem a especificação CloudEvents 1.0 | Must Have |
| RF-10 | Atributos obrigatórios: `id` (UUID único), `source` (cadastro-api), `type` (ex: `cadastro.obra.liberada`), `time` (ISO 8601), `specversion` (1.0), `datacontenttype` (application/json) | Must Have |
| RF-11 | Campo `data` contém o payload específico do evento em JSON | Must Have |
| RF-12 | Campo `subject` contém o ID da entidade afetada (ex: obraId) | Must Have |

**Exemplo de evento CloudEvents:**
```json
{
  "specversion": "1.0",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source": "cadastro-api",
  "type": "cadastro.obra.liberada",
  "subject": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
  "time": "2026-04-01T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "obraId": "d1e2f3a4-b5c6-7890-abcd-ef1234567890",
    "titulo": "Meu Bem Querer",
    "iswc": "T-336305833-4"
  }
}
```

### 3. Infraestrutura de Mensageria

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-13 | Exchange tipo `topic` no RabbitMQ: `cadastro.events` | Must Have |
| RF-14 | Routing key segue padrão: `cadastro.{entidade}.{acao}` (ex: `cadastro.obra.liberada`) | Must Have |
| RF-15 | Exchange criada automaticamente no startup da aplicação (se não existir) | Must Have |

### 4. Outbox Pattern

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-16 | Tabela `outbox_events` no schema `cadastro`: id, type, routing_key, payload (JSON), created_at, published_at (nullable), attempts | Must Have |
| RF-17 | Evento salvo na tabela outbox **na mesma transação** da entidade (SaveChanges atômico) | Must Have |
| RF-18 | Worker background (hosted service) que lê eventos não publicados da outbox e publica no RabbitMQ | Must Have |
| RF-19 | Após publicação bem-sucedida, atualizar `published_at` na outbox | Must Have |
| RF-20 | Se publicação falhar, incrementar `attempts` e tentar novamente no próximo ciclo | Must Have |
| RF-21 | Eventos com mais de 10 tentativas são marcados como falhos (não retentados) | Should Have |
| RF-22 | Worker executa a cada 5 segundos (configurável via .env) | Must Have |

**Critérios de Aceitação — RF-17:**
- **Given** o Analista libera uma obra
- **When** o sistema executa SaveChanges
- **Then** a tabela `outbox_events` contém o evento `cadastro.obra.liberada` E a obra está com status LIBERADO (mesma transação)

**Critérios de Aceitação — RF-18:**
- **Given** existe um evento não publicado na outbox (published_at = null)
- **When** o worker executa
- **Then** o evento é publicado no RabbitMQ e `published_at` é preenchido

### 5. Idempotência

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-23 | Cada evento tem `id` UUID único (gerado na criação) | Must Have |
| RF-24 | Consumers podem receber o mesmo evento mais de uma vez sem efeito colateral (at-least-once) | Must Have |
| RF-25 | O `id` do evento é incluído como `MessageId` na mensagem do RabbitMQ | Must Have |

---

## Experiência do Usuário

F08 é **100% backend** — sem impacto na interface do usuário. O Analista não vê diferença operacional. Os eventos fluem nos bastidores.

---

## Restrições Técnicas de Alto Nível

- RabbitMQ 3.13 (conforme Vision Doc)
- Exchange `cadastro.events` tipo `topic`
- Tabela `outbox_events` no schema `cadastro` do PostgreSQL
- Worker como `BackgroundService` (.NET hosted service)
- CloudEvents 1.0 (spec: https://cloudevents.io/)
- Biblioteca: `CloudNative.CloudEvents` (NuGet) para serialização
- Biblioteca: `RabbitMQ.Client` para publicação
- Connection string do RabbitMQ via .env

---

## Não-Objetivos (Fora de Escopo)

- Não implementa consumers (Fases 2-4)
- Não implementa Dead Letter Queue (DLQ)
- Não implementa retry com backoff exponencial (retry simples no worker)
- Não impacta frontend
- Não publica eventos retroativos (apenas para transições futuras)
- Não implementa event sourcing (outbox é complementar, não substitui)
- Não publica eventos para operações CRUD simples (criar/editar obra, editar titular, etc.) — apenas transições de estado relevantes

---

## Rastreabilidade

### Vision Doc
- **Restrição técnica:** RabbitMQ 3.13 como broker AMQP
- **Padrão arquitetural:** Event-Driven (backbone de integração entre contextos)

### Domain Doc (Cadastro — D01)
- **Feature:** F08 — Eventos de Cadastro
- **Eventos definidos:** 5 no Domain Doc + 3 adicionados (depurada, fonograma depurado/bloqueado) = 8 total
- **Dependências:** Upstream: F02 (titular.criado), F03 (obra.depurada, obra.dominio-publico), F05 (fonograma.depurado), F07 (obra.liberada, obra.bloqueada, fonograma.liberado, fonograma.bloqueado)
- **Downstream:** D02 (Identificação — consome fonograma.liberado), D04 (Distribuição — consome obra.liberada), Analytics (consome todos)

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`.*
