# PRD — F01: Sincronização de Rubricas

> **Domínio:** Distribuição (D04)
> **Feature ID:** F01
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-08

---

## Visão Geral

Rubricas são os segmentos de utilização musical (Rádio, TV Aberta, Streaming, etc.) que estruturam todo o processo de distribuição de créditos. A fonte de verdade das rubricas é o domínio Arrecadação, que publica eventos `arrecadacao.rubrica.criada` e `arrecadacao.rubrica.atualizada` via Outbox Pattern.

A Distribuição precisa de uma cópia local dessas rubricas para operar sem acoplamento HTTP runtime com a Arrecadação. Esta feature implementa o lado consumidor do padrão Event-Driven ACL (Anti-Corruption Layer): escuta os eventos, persiste uma cópia local no schema `distribuicao` e expõe consulta read-only para uso interno e para a tela de acompanhamento.

**Problema:** Sem rubricas disponíveis localmente, o Analista de Distribuição não consegue criar processos de distribuição (F02) nem o sistema consegue associar créditos a uma rubrica no cálculo (F03). Consultar a Arrecadação por HTTP a cada operação criaria acoplamento runtime indesejado.

**Solução:** Consumidor de eventos que mantém cópia local sincronizada, com API e tela read-only para consulta.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Rubricas sincronizadas automaticamente a partir da Arrecadação | 7 registros presentes na cópia local após consumo dos eventos de seed, sem intervenção manual |
| Zero acoplamento HTTP runtime com Arrecadação | Nenhuma chamada HTTP para consultar rubricas em nenhum fluxo do domínio Distribuição |
| Dados sempre consistentes com a fonte de verdade | Cópia local reflete 100% dos dados publicados pela Arrecadação (sigla, nome, exige classificação) |
| Consulta funcional para uso interno e tela | Listagem de rubricas carrega em menos de 1 segundo |

---

## Histórias de Usuário

### HU-01 — Sincronização automática de rubricas
**Como** sistema (automático),
**eu preciso** consumir eventos `arrecadacao.rubrica.criada` e `arrecadacao.rubrica.atualizada` do RabbitMQ e persistir os dados no schema local,
**para que** o domínio Distribuição tenha acesso a rubricas sem depender de chamadas HTTP à Arrecadação.

### HU-02 — Consultar rubricas disponíveis
**Como** Analista de Distribuição ou Consultor de Distribuição,
**eu quero** visualizar a lista de rubricas sincronizadas com sigla, nome e indicação de exigência de classificação,
**para que** eu possa acompanhar quais segmentos de utilização musical estão disponíveis para distribuição.

### HU-03 — Selecionar rubrica ao criar processo
**Como** Analista de Distribuição,
**eu quero** selecionar uma rubrica a partir da cópia local ao criar um processo de distribuição,
**para que** o vínculo processo-rubrica seja registrado corretamente sem depender de outro domínio.

> **Nota:** HU-03 será implementada na F02 (Gestão de Processos de Distribuição). Listada aqui para rastreabilidade — a F01 deve garantir que os dados e o endpoint estejam disponíveis para consumo.

---

## Funcionalidades Principais

### 1. Consumo de Eventos de Rubrica

O sistema deve consumir eventos `arrecadacao.rubrica.criada` e `arrecadacao.rubrica.atualizada` publicados pela Arrecadação no RabbitMQ e persistir os dados como cópia local no schema `distribuicao`.

**Dados sincronizados por rubrica:**

| Atributo | Descrição | Origem no Evento |
|----------|-----------|-----------------|
| sigla | Identificador único da rubrica (chave natural) | `data.sigla` |
| nome | Nome legível do segmento | `data.nome` |
| exige classificação | Se execuções nesta rubrica exigem tipo de utilização (TA, TE, PE, BK) | `data.exigeClassificacao` |

**Rubricas esperadas (7 registros, propagadas da Arrecadação):**

| Sigla | Nome | Exige Classificação |
|-------|------|---------------------|
| RADIO | Rádio AM/FM | Não |
| TV_ABERTA | TV Aberta | Sim |
| TV_FECHADA | TV Fechada | Sim |
| CINEMA | Cinema | Sim |
| VOD | Streaming Vídeo (VOD) | Sim |
| STREAMING_AUDIO | Streaming Áudio | Não |
| SHOW | Show | Não |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | O sistema deve consumir eventos `arrecadacao.rubrica.criada` do RabbitMQ e persistir os dados (sigla, nome, exige classificação) no schema `distribuicao` | Must Have |
| RF-02 | O sistema deve consumir eventos `arrecadacao.rubrica.atualizada` do RabbitMQ e atualizar a cópia local correspondente | Must Have |
| RF-03 | O consumo deve ser idempotente — processar o mesmo evento múltiplas vezes não deve duplicar registros (upsert por sigla) | Must Have |
| RF-04 | O consumidor deve utilizar a sigla como chave natural para identificar e atualizar rubricas | Must Have |
| RF-05 | Eventos com payload inválido (sigla ausente, formato incorreto) devem ser descartados com log de erro, sem bloquear o consumo de eventos subsequentes | Must Have |

**Critérios de Aceitação — RF-01:**
- **Given** a Arrecadação publicou o evento `arrecadacao.rubrica.criada` com sigla "RADIO", nome "Rádio AM/FM" e exige classificação = false
- **When** o consumidor da Distribuição processa o evento
- **Then** existe um registro no schema `distribuicao` com sigla "RADIO", nome "Rádio AM/FM" e exige classificação = false

**Critérios de Aceitação — RF-02:**
- **Given** existe a rubrica "RADIO" na cópia local com nome "Rádio AM/FM"
- **When** o consumidor processa o evento `arrecadacao.rubrica.atualizada` com sigla "RADIO" e nome "Rádio AM/FM (atualizado)"
- **Then** o registro local é atualizado para nome "Rádio AM/FM (atualizado)"

**Critérios de Aceitação — RF-03:**
- **Given** o evento `arrecadacao.rubrica.criada` com sigla "RADIO" já foi processado
- **When** o mesmo evento é recebido novamente (redelivery)
- **Then** o registro existente é mantido sem duplicação e sem erro

**Critérios de Aceitação — RF-05:**
- **Given** um evento `arrecadacao.rubrica.criada` é recebido com payload sem sigla
- **When** o consumidor tenta processá-lo
- **Then** o evento é descartado (acknowledged), um log de erro é registrado e o consumidor continua operando normalmente

### 2. API de Consulta de Rubricas (Read-Only)

Endpoint para consumo interno pela tela de listagem e por features futuras (F02 — Processos, F03 — Cálculo).

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-06 | API de listagem de rubricas retornando todos os registros sincronizados com id, sigla, nome e exige classificação | Must Have |
| RF-07 | API de consulta individual por sigla retornando os dados de uma rubrica específica | Should Have |
| RF-08 | Apenas endpoints de leitura (GET) devem ser expostos — sem POST, PUT, PATCH ou DELETE | Must Have |

**Critérios de Aceitação — RF-06:**
- **Given** 7 rubricas foram sincronizadas via eventos
- **When** um consumidor faz GET na listagem de rubricas
- **Then** retorna array com 7 objetos contendo id, sigla, nome e exige classificação

- **Given** nenhuma rubrica foi sincronizada ainda (Arrecadação não publicou eventos)
- **When** um consumidor faz GET na listagem de rubricas
- **Then** retorna array vazio (HTTP 200 com `[]`)

**Critérios de Aceitação — RF-07:**
- **Given** a rubrica "TV_ABERTA" está sincronizada localmente
- **When** um consumidor faz GET buscando a rubrica com sigla "TV_ABERTA"
- **Then** retorna objeto com sigla "TV_ABERTA", nome "TV Aberta" e exige classificação = true

- **Given** a sigla "INEXISTENTE" não existe na cópia local
- **When** um consumidor faz GET buscando essa sigla
- **Then** retorna HTTP 404 Not Found

**Critérios de Aceitação — RF-08:**
- **Given** qualquer cliente
- **When** tenta fazer POST, PUT, PATCH ou DELETE no recurso de rubricas
- **Then** retorna HTTP 405 Method Not Allowed

### 3. Tela de Consulta de Rubricas (Read-Only)

Tela no módulo Distribuição para visualizar as rubricas sincronizadas.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-09 | Tela de listagem exibindo todas as rubricas sincronizadas em tabela com colunas: sigla, nome e exige classificação | Must Have |
| RF-10 | A tela deve indicar visualmente que os dados são somente leitura (sem botões de ação/edição) | Must Have |
| RF-11 | Se nenhuma rubrica foi sincronizada, exibir estado vazio com mensagem explicativa (ex: "Nenhuma rubrica sincronizada. Aguardando eventos da Arrecadação.") | Must Have |

**Critérios de Aceitação — RF-09:**
- **Given** o Analista de Distribuição acessa o menu "Distribuição" → "Rubricas"
- **When** a tela é carregada
- **Then** exibe tabela com as rubricas sincronizadas, mostrando sigla, nome e indicador de exigência de classificação

**Critérios de Aceitação — RF-11:**
- **Given** nenhuma rubrica foi sincronizada (cópia local vazia)
- **When** o Analista acessa a tela de rubricas
- **Then** exibe estado vazio com mensagem informando que rubricas serão sincronizadas automaticamente

---

## Experiência do Usuário

### Fluxo Principal
1. Usuário acessa o menu "Distribuição" → "Rubricas"
2. Sistema exibe tabela com as rubricas sincronizadas (sigla, nome, exige classificação)
3. Usuário consulta os dados — sem ações de edição disponíveis

### Considerações de UI
- Tabela simples, sem paginação (máximo 7 registros)
- Sem filtros ou busca (volume fixo e pequeno)
- Indicação visual de que os dados são read-only (ausência de botões de ação)
- Coluna "Exige Classificação" com indicador visual (ex: badge Sim/Não)
- Estado vazio com mensagem explicativa quando não há rubricas sincronizadas

---

## Restrições Técnicas de Alto Nível

- **Stack:** Java Spring Boot (domínio Distribuição)
- Dados devem residir no schema `distribuicao` do PostgreSQL (Schema-per-Service)
- Consumo de eventos do RabbitMQ com garantia at-least-once (idempotência no consumidor)
- Formato CloudEvents nos eventos consumidos (consistente com Arrecadação e Cadastro)
- Sem chamadas HTTP à Arrecadação — a cópia local é a única fonte de dados de rubrica para o domínio
- Frontend React + Vite (mesmo padrão do projeto)

---

## Não-Objetivos (Fora de Escopo)

- Seed local de fallback — o domínio depende 100% dos eventos da Arrecadação
- Publicação de eventos — esta feature apenas consome, não produz eventos
- Edição de rubricas — dados controlados exclusivamente pela Arrecadação
- Lógica de ativação/desativação de rubricas
- Dados adicionais além de sigla, nome e exige classificação
- Tela de administração ou configuração de rubricas
- Retry com dead-letter queue para eventos com falha — será tratado como concern transversal em feature futura se necessário

---

## Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Demonstrar padrão Event-Driven ACL entre bounded contexts sem acoplamento runtime
- **Perfis:** Analista de Distribuição, Consultor de Distribuição
- **Restrição global:** PoC auto-contida, RabbitMQ como broker, Schema-per-Service
- **Glossário:** Rubrica — "Segmento de utilização musical: Rádio AM/FM, TV Aberta, TV Fechada, Streaming, Show, Cinema"

### Domain Doc (Distribuição — D04)
- **Feature:** F01 — Sincronização de Rubricas
- **Entidade:** Rubrica (cópia local) — sigla, nome, exige classificação
- **Eventos consumidos:** `arrecadacao.rubrica.criada`, `arrecadacao.rubrica.atualizada`
- **Dependências upstream:** Arrecadação (eventos de rubrica)
- **Dependências downstream:** F02 (Gestão de Processos) e F03 (Cálculo de Créditos) consomem a cópia local
- **Ordem de implementação:** Primeira feature do domínio (pré-requisito para todo o fluxo)

### Domain Doc (Arrecadação — D03)
- **Regra referenciada:** RN-08 — Rubrica é dado de referência (seed fixo), não editável, alterações propagadas via eventos para domínios consumidores
- **Eventos produzidos:** `arrecadacao.rubrica.criada` (payload: sigla, nome, exige classificação)

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator` fornecendo este PRD, o `vision.md` e o `domain.md` como contexto.*
