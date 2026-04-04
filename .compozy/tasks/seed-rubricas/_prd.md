# PRD — F01: Seed de Rubricas

> **Domínio:** Arrecadação (D03)
> **Feature ID:** F01
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-04

---

## Visão Geral

Rubricas são os segmentos de utilização musical que estruturam todo o fluxo de arrecadação e distribuição do ECAD — determinam como a receita é categorizada, como as execuções são classificadas e como os créditos são distribuídos. No mini-ECAD, a Arrecadação é a fonte de verdade das rubricas para todo o sistema.

Esta feature é o alicerce do domínio Arrecadação: sem rubricas disponíveis, não é possível criar licenças (F03), registrar pagamentos (F04) nem calcular verba líquida (F05). Além disso, Identificação e Distribuição dependem desses dados para operar — a propagação via eventos garante sincronização sem acoplamento runtime.

**Problema:** O sistema precisa de rubricas disponíveis desde o startup, sem cadastro manual, para que o fluxo de licenciamento e arrecadação funcione imediatamente. Outros domínios (Identificação, Distribuição) precisam de uma cópia local sincronizada dessas rubricas sem depender de chamadas HTTP síncronas.

**Solução:** Carga automática (seed) das 7 rubricas via migration, não editáveis por nenhum perfil, com endpoint de consulta read-only para uso interno e publicação de eventos via Outbox Pattern para sincronização com outros domínios.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Rubricas disponíveis desde o primeiro uso | 7 registros presentes no sistema após primeiro startup, sem intervenção manual |
| Dados íntegros e não adulteráveis | Nenhuma operação de criação, edição ou exclusão disponível para qualquer perfil |
| Sincronização event-driven com outros domínios | 7 eventos `arrecadacao.rubrica.criada` publicados no RabbitMQ após startup |
| Endpoint funcional para uso interno | Listagem de rubricas carrega em menos de 1 segundo com todos os registros |

---

## Histórias de Usuário

### HU-01 — Consultar rubricas
**Como** Analista de Arrecadação ou Consultor de Arrecadação,
**eu quero** visualizar a lista completa de rubricas com sigla, nome e indicação de exigência de classificação,
**para que** eu possa consultar os segmentos de utilização musical disponíveis ao trabalhar com licenças e pagamentos.

### HU-02 — Rubricas disponíveis no startup
**Como** sistema (automático),
**eu preciso** que as 7 rubricas estejam cadastradas automaticamente na primeira inicialização,
**para que** o fluxo de licenciamento e arrecadação funcione sem necessidade de carga manual prévia.

### HU-03 — Sincronização com outros domínios
**Como** sistema (automático),
**eu preciso** publicar um evento `arrecadacao.rubrica.criada` para cada rubrica que ainda não teve evento publicado,
**para que** Identificação e Distribuição mantenham cópias locais sincronizadas sem acoplamento HTTP.

### HU-04 — Selecionar rubrica ao criar licença
**Como** Analista de Arrecadação,
**eu quero** selecionar uma rubrica a partir de uma lista ao criar uma licença,
**para que** o vínculo licença-rubrica seja registrado corretamente.

> **Nota:** HU-04 será implementada na F03 (Gestão de Licenças). Listada aqui para rastreabilidade — a F01 deve garantir que os dados e o endpoint estejam disponíveis para consumo.

---

## Funcionalidades Principais

### 1. Seed Automático de Rubricas

O sistema deve popular automaticamente as 7 rubricas via migration. Se os dados já existirem, o seed não deve duplicar registros.

**Dados das rubricas:**

| # | Sigla | Nome | Exige Classificação |
|---|-------|------|---------------------|
| 1 | RADIO | Rádio AM/FM | Não |
| 2 | TV_ABERTA | TV Aberta | Sim |
| 3 | TV_FECHADA | TV Fechada | Sim |
| 4 | CINEMA | Cinema | Sim |
| 5 | VOD | Streaming Vídeo (VOD) | Sim |
| 6 | STREAMING_AUDIO | Streaming Áudio | Não |
| 7 | SHOW | Show | Não |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | O sistema deve conter as 7 rubricas pré-cadastradas automaticamente via migration na primeira inicialização | Must Have |
| RF-02 | Cada rubrica deve conter os atributos: sigla (identificador único), nome e exige classificação (boolean) | Must Have |
| RF-03 | O seed deve ser idempotente — executar múltiplas vezes não deve duplicar registros | Must Have |
| RF-04 | Rubricas não podem ser criadas, editadas ou excluídas por nenhum perfil de usuário via interface ou API | Must Have |

**Critérios de Aceitação — RF-01:**
- **Given** o sistema é iniciado pela primeira vez
- **When** o processo de startup é concluído
- **Then** existem exatamente 7 rubricas cadastradas no sistema com os dados da tabela acima

**Critérios de Aceitação — RF-03:**
- **Given** as 7 rubricas já existem no sistema
- **When** o processo de startup é executado novamente
- **Then** continuam existindo exatamente 7 rubricas, sem duplicatas

**Critérios de Aceitação — RF-04:**
- **Given** qualquer perfil de usuário (Analista ou Consultor de Arrecadação)
- **When** tenta criar, editar ou excluir uma rubrica
- **Then** a operação é negada (sem endpoint de escrita exposto)

### 2. Publicação de Eventos via Outbox Pattern

O sistema deve publicar um evento `arrecadacao.rubrica.criada` no RabbitMQ para cada rubrica que ainda não teve evento publicado. A detecção é automática no startup da aplicação.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-05 | Para cada rubrica sem evento publicado, o sistema deve inserir um registro na tabela de outbox com o evento `arrecadacao.rubrica.criada` | Must Have |
| RF-06 | O evento deve seguir o formato CloudEvents (consistente com o domínio Cadastro) | Must Have |
| RF-07 | O payload do evento deve conter: sigla, nome e exige classificação | Must Have |
| RF-08 | O processo de detecção e publicação deve ser idempotente — rubricas com evento já publicado não devem gerar eventos duplicados | Must Have |
| RF-09 | O mecanismo de outbox deve processar os registros pendentes e publicar no RabbitMQ com garantia at-least-once | Must Have |

**Critérios de Aceitação — RF-05:**
- **Given** o sistema é iniciado e existem rubricas sem evento publicado
- **When** o processo de detecção automática executa
- **Then** um registro de outbox é criado para cada rubrica pendente com tipo `arrecadacao.rubrica.criada`

**Critérios de Aceitação — RF-08:**
- **Given** todas as 7 rubricas já tiveram eventos publicados
- **When** o sistema é reiniciado e o processo de detecção executa
- **Then** nenhum novo evento é gerado

**Critérios de Aceitação — RF-06:**
- **Given** um evento `arrecadacao.rubrica.criada` é publicado
- **When** um consumidor lê o evento do RabbitMQ
- **Then** o envelope segue o formato CloudEvents com campos: id, source, type, time, specversion e data

### 3. API de Consulta de Rubricas (Read-Only)

Endpoint para consumo interno pela tela de listagem e por features futuras (F03 — Licenças).

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-10 | API de listagem de rubricas retornando todos os registros com id, sigla, nome e exige classificação | Must Have |
| RF-11 | API de consulta individual por sigla retornando os dados de uma rubrica específica | Should Have |
| RF-12 | Apenas endpoints de leitura (GET) devem ser expostos — sem POST, PUT, PATCH ou DELETE | Must Have |

**Critérios de Aceitação — RF-10:**
- **Given** um consumidor faz GET na listagem de rubricas
- **When** a requisição é processada
- **Then** retorna array com 7 objetos contendo id, sigla, nome e exige classificação

**Critérios de Aceitação — RF-11:**
- **Given** um consumidor faz GET buscando a rubrica com sigla "TV_ABERTA"
- **When** a requisição é processada
- **Then** retorna objeto com sigla "TV_ABERTA", nome "TV Aberta" e exige classificação = true

- **Given** um consumidor faz GET buscando uma sigla inexistente
- **When** a requisição é processada
- **Then** retorna HTTP 404 Not Found

**Critérios de Aceitação — RF-12:**
- **Given** um consumidor tenta fazer POST, PUT, PATCH ou DELETE no recurso de rubricas
- **When** a requisição é recebida
- **Then** retorna HTTP 405 Method Not Allowed

---

## Experiência do Usuário

### Fluxo Principal
1. Usuário acessa o menu "Arrecadação" → "Rubricas"
2. Sistema exibe tabela com as 7 rubricas (sigla, nome, exige classificação)
3. Usuário consulta os dados — sem ações de edição disponíveis

### Considerações de UI
- Tabela simples, sem paginação (apenas 7 registros)
- Sem filtros ou busca (volume fixo e pequeno)
- Indicação visual de que os dados são read-only (ausência de ícones de ação)
- Coluna "Exige Classificação" com indicador visual (ex: badge Sim/Não)

---

## Restrições Técnicas de Alto Nível

- **Stack:** Java Spring Boot (domínio Arrecadação)
- Dados devem residir no schema `arrecadacao` do PostgreSQL (Schema-per-Service)
- Seed executado via Flyway migration
- Eventos publicados via Outbox Pattern com garantia at-least-once (primeira implementação em Java no projeto — Cadastro implementou em .NET)
- Formato CloudEvents para os eventos (consistente com Cadastro)
- Mensageria via RabbitMQ (já disponível na infraestrutura da Fase 1)

---

## Não-Objetivos (Fora de Escopo)

- CRUD de rubricas — são dados fixos e imutáveis
- Evento `arrecadacao.rubrica.atualizada` — não há edição na v1
- Migração do seed de rubricas na Identificação — será tratada em PRD separado no domínio Identificação
- UI de gestão/edição de rubricas
- Dados adicionais (descrição longa, ícone, cor, etc.)
- Lógica de ativação/desativação de rubricas

---

## Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Estabelecer dados de referência compartilhados entre domínios usando event-driven ACL
- **Perfis:** Analista de Arrecadação, Consultor de Arrecadação
- **Restrição global:** PoC auto-contida, RabbitMQ como broker de eventos
- **Glossário:** Rubrica — "Segmento de utilização musical: Rádio AM/FM, TV Aberta, TV Fechada, Streaming, Show, Cinema"

### Domain Doc (Arrecadação — D03)
- **Feature:** F01 — Seed de Rubricas
- **Entidade:** Rubrica (sigla, nome, exige classificação)
- **Regras referenciadas:** RN-08 (seed fixo, não editável, alterações propagadas via eventos)
- **Eventos produzidos:** `arrecadacao.rubrica.criada`
- **Dependências:** Nenhuma upstream; downstream: F03 (Gestão de Licenças) consome endpoint de listagem; Identificação e Distribuição consomem eventos
- **Ordem de implementação:** Primeira feature do domínio (pré-requisito para todo o fluxo)

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator` fornecendo este PRD, o `vision.md` e o `domain.md` como contexto.*
