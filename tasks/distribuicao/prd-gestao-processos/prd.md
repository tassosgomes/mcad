# PRD — F02: Gestão de Processos de Distribuição

> **Domínio:** Distribuição (D04)
> **Feature ID:** F02
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-10
> **Revisão:** 2026-05-15 — alinhado ao novo padrão de Permissionamento (ecad-authz / `@RequiresPermission` em 4 segmentos) e Auditoria obrigatória (audit-sdk + tabela `audit_outbox`) consolidados pela migração authz encerrada em 2026-05-15. Ver ADRs `docs/adr/0002` (naming) e `docs/adr/0003` (backend autoritativo), e relatório `docs/migracao-authz/relatorio-final.md`.

---

## Visão Geral

O Processo de Distribuição é a operação central do domínio — cruza a verba líquida da Arrecadação com o Rol de Execuções da Identificação para calcular créditos de uma rubrica e período. Antes de calcular, o Analista precisa criar o processo, e para isso o sistema deve saber o que está disponível.

Esta feature implementa o ciclo de vida completo do Processo de Distribuição: consumo de eventos upstream para saber quais Rols e Verbas estão disponíveis, criação com validação de pré-requisitos, máquina de estados com transições controladas, cancelamento com justificativa e publicação de eventos de ciclo de vida via Outbox Pattern.

**Problema:** Sem um processo estruturado e rastreável, não há como organizar, auditar e controlar o fluxo de distribuição — quem criou, quando calculou, se foi aprovado, se foi cancelado e por quê. A máquina de estados garante que o cálculo de créditos (F03) só ocorre dentro de um processo válido, com dados upstream confirmados.

**Solução:** Entidade Processo de Distribuição com máquina de estados, consumo de eventos para snapshots de Rol e Verba, CRUD com validação de pré-requisitos, e publicação de eventos de ciclo de vida.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Processos criados apenas com dados upstream válidos | 100% dos processos criados têm Rol fechado e Verba disponível associados |
| Rastreabilidade completa do ciclo de vida | Todo processo tem histórico de transições com data, analista e justificativa (cancelamento) |
| Unicidade por rubrica+período | Zero processos duplicados não-cancelados para a mesma rubrica+período |
| Snapshots disponíveis para o Analista | Rols fechados e Verbas disponíveis visíveis na tela antes de criar processo |

---

## Histórias de Usuário

### HU-01 — Receber snapshots de Rol e Verba
**Como** sistema (automático),
**eu preciso** consumir eventos `identificacao.rol.fechado`, `identificacao.rol.cancelado` e `arrecadacao.verba.disponivel` e armazenar snapshots locais,
**para que** o domínio Distribuição saiba quais combinações rubrica+período estão prontas para distribuição, sem acoplamento HTTP runtime.

### HU-02 — Criar processo de distribuição
**Como** Analista de Distribuição,
**eu quero** criar um processo de distribuição selecionando uma rubrica e um período que tenham Rol fechado e Verba disponível,
**para que** eu possa iniciar o fluxo de cálculo e distribuição de créditos para esse segmento.

### HU-03 — Listar e filtrar processos
**Como** Analista de Distribuição ou Consultor de Distribuição,
**eu quero** visualizar a lista de processos de distribuição com filtros por rubrica, período e status,
**para que** eu possa acompanhar o andamento dos processos e identificar rapidamente os que precisam de ação.

### HU-04 — Visualizar detalhes do processo
**Como** Analista de Distribuição ou Consultor de Distribuição,
**eu quero** visualizar os detalhes de um processo de distribuição (rubrica, período, status, verba utilizada, total de execuções, analista, datas de transição),
**para que** eu possa auditar e acompanhar o estado do processo.

### HU-05 — Aprovar processo calculado
**Como** Analista de Distribuição,
**eu quero** aprovar um processo que já foi calculado,
**para que** os créditos sejam confirmados e o processo avance para finalização.

### HU-06 — Finalizar processo aprovado
**Como** Analista de Distribuição,
**eu quero** finalizar um processo aprovado com confirmação explícita de que a ação é irreversível,
**para que** os créditos se tornem definitivos e o Rol utilizado seja bloqueado para cancelamento na Identificação.

### HU-07 — Cancelar processo
**Como** Analista de Distribuição,
**eu quero** cancelar um processo que ainda não foi finalizado, informando uma justificativa obrigatória,
**para que** o processo seja invalidado e eu possa criar um novo para a mesma rubrica+período.

---

## Funcionalidades Principais

### 1. Consumo de Eventos Upstream (Snapshots)

O sistema deve consumir eventos dos domínios Identificação e Arrecadação para manter snapshots locais que habilitam a criação de processos.

**Eventos consumidos:**

| Evento | Origem | Dados Armazenados | Finalidade |
|--------|--------|-------------------|------------|
| `identificacao.rol.fechado` | Identificação | rubrica, período, captação_id, total de execuções, lista resumida de execuções | Pré-requisito para criar processo |
| `identificacao.rol.cancelado` | Identificação | rubrica, período, captação_id | Invalida snapshot; bloqueia criação de processo |
| `arrecadacao.verba.disponivel` | Arrecadação | rubrica, período, valor bruto, deduções, verba líquida | Pré-requisito para criar processo |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | O sistema deve consumir `identificacao.rol.fechado` e armazenar snapshot local do Rol com rubrica, período e metadados | Must Have |
| RF-02 | O sistema deve consumir `identificacao.rol.cancelado` e invalidar o snapshot do Rol correspondente (marcar como cancelado) | Must Have |
| RF-03 | O sistema deve consumir `arrecadacao.verba.disponivel` e armazenar/atualizar snapshot local da Verba com rubrica, período e valor líquido | Must Have |
| RF-04 | O consumo deve ser idempotente — processar o mesmo evento múltiplas vezes não duplica snapshots | Must Have |

**Critérios de Aceitação — RF-01:**
- **Given** a Identificação publicou `identificacao.rol.fechado` com rubrica "RADIO" e período "2026-03"
- **When** o consumidor da Distribuição processa o evento
- **Then** existe um snapshot local de Rol com rubrica "RADIO", período "2026-03" e status "disponível"

**Critérios de Aceitação — RF-02:**
- **Given** existe snapshot de Rol para rubrica "RADIO" e período "2026-03"
- **When** o consumidor processa `identificacao.rol.cancelado` para a mesma rubrica+período
- **Then** o snapshot é marcado como "cancelado" e não aparece como opção para criar processo

**Critérios de Aceitação — RF-03:**
- **Given** a Arrecadação publicou `arrecadacao.verba.disponivel` com rubrica "RADIO", período "2026-03" e verba líquida R$ 85.000,00
- **When** o consumidor da Distribuição processa o evento
- **Then** existe snapshot local de Verba com rubrica "RADIO", período "2026-03" e verba líquida R$ 85.000,00

### 2. Criação de Processo de Distribuição

O Analista cria um processo selecionando uma rubrica e um período. O sistema valida que existem Rol fechado e Verba disponível para essa combinação, e que não existe outro processo não-cancelado.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-05 | O Analista deve poder criar um processo de distribuição selecionando rubrica e período | Must Have |
| RF-06 | O sistema deve validar que existe Rol fechado (não cancelado) para a rubrica+período selecionados | Must Have |
| RF-07 | O sistema deve validar que existe Verba disponível para a rubrica+período selecionados | Must Have |
| RF-08 | O sistema deve impedir a criação se já existir um processo não-cancelado para a mesma rubrica+período | Must Have |
| RF-09 | O processo deve ser criado com status CRIADO, registrando rubrica, período, verba líquida, analista responsável e data de criação | Must Have |
| RF-10 | Ao criar, o sistema deve publicar o evento `distribuicao.processo.criado` via Outbox Pattern | Must Have |

**Critérios de Aceitação — RF-05 + RF-06 + RF-07:**
- **Given** existe Rol fechado e Verba disponível para rubrica "RADIO" período "2026-03"
- **When** o Analista cria um processo para "RADIO" / "2026-03"
- **Then** o processo é criado com status CRIADO, verba líquida armazenada e analista registrado

**Critérios de Aceitação — RF-06 (falha):**
- **Given** não existe Rol fechado para rubrica "TV_ABERTA" período "2026-03"
- **When** o Analista tenta criar um processo para "TV_ABERTA" / "2026-03"
- **Then** a criação é rejeitada com mensagem "Não existe Rol de Execuções fechado para esta rubrica e período"

**Critérios de Aceitação — RF-08:**
- **Given** já existe um processo com status CALCULADO para rubrica "RADIO" período "2026-03"
- **When** o Analista tenta criar outro processo para "RADIO" / "2026-03"
- **Then** a criação é rejeitada com mensagem "Já existe um processo de distribuição ativo para esta rubrica e período"

### 3. Listagem e Detalhes de Processos

Tela de listagem com filtros e tela de detalhes com informações completas do processo.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-11 | Tela de listagem com colunas: rubrica, período, status, verba líquida, analista, data de criação | Must Have |
| RF-12 | Filtros na listagem: rubrica (select), período (YYYY-MM), status (multi-select) | Must Have |
| RF-13 | Paginação na listagem (volume pode crescer ao longo do tempo) | Must Have |
| RF-14 | Tela de detalhes exibindo: dados do processo, datas de cada transição de estado, justificativa de cancelamento (quando aplicável) | Must Have |
| RF-15 | Na tela de detalhes, exibir botões de ação conforme o estado atual (Calcular, Aprovar, Finalizar, Cancelar) | Must Have |

**Critérios de Aceitação — RF-11:**
- **Given** existem 3 processos de distribuição no sistema
- **When** o Analista acessa a tela de listagem
- **Then** exibe tabela com os 3 processos mostrando rubrica (sigla+nome), período, badge de status, verba, analista e data

**Critérios de Aceitação — RF-12:**
- **Given** existem processos para RADIO e TV_ABERTA
- **When** o Analista filtra por rubrica "RADIO"
- **Then** exibe apenas os processos da rubrica RADIO

**Critérios de Aceitação — RF-15:**
- **Given** o processo está no estado CRIADO
- **When** o Analista visualiza os detalhes
- **Then** exibe botões "Calcular" e "Cancelar"

- **Given** o processo está no estado CALCULADO
- **When** o Analista visualiza os detalhes
- **Then** exibe botões "Aprovar" e "Cancelar"

- **Given** o processo está no estado APROVADO
- **When** o Analista visualiza os detalhes
- **Then** exibe botões "Finalizar" e "Cancelar"

- **Given** o processo está no estado FINALIZADO ou CANCELADO
- **When** o Analista visualiza os detalhes
- **Then** nenhum botão de ação é exibido

### 4. Máquina de Estados e Transições

Transições controladas com validação, eventos e confirmações.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-16 | A transição CRIADO → CALCULADO deve ser disparada pelo Analista ao clicar "Calcular" (a lógica de cálculo é da F03; F02 fornece a transição de estado) | Must Have |
| RF-17 | A transição CALCULADO → APROVADO deve ser uma ação direta do Analista (sem confirmação modal) | Must Have |
| RF-18 | A transição APROVADO → FINALIZADO deve exigir confirmação explícita com aviso de irreversibilidade | Must Have |
| RF-19 | Ao finalizar, o sistema deve publicar `distribuicao.processo.finalizado` e `distribuicao.rol.processado` via Outbox Pattern | Must Have |
| RF-20 | O cancelamento deve ser possível a partir de qualquer estado exceto FINALIZADO, com justificativa obrigatória (texto livre, min 10 caracteres) | Must Have |
| RF-21 | Ao cancelar, o sistema deve publicar `distribuicao.processo.cancelado` via Outbox Pattern | Must Have |
| RF-22 | Transições inválidas devem ser rejeitadas (ex: CRIADO → APROVADO, FINALIZADO → CANCELADO) | Must Have |
| RF-23 | Cada transição deve registrar a data e o analista responsável | Must Have |
| RF-24 | Ao aprovar, o sistema deve publicar `distribuicao.processo.aprovado` via Outbox Pattern | Must Have |

**Critérios de Aceitação — RF-17:**
- **Given** o processo está no estado CALCULADO
- **When** o Analista clica "Aprovar"
- **Then** o estado transiciona para APROVADO e o evento `distribuicao.processo.aprovado` é publicado

**Critérios de Aceitação — RF-18:**
- **Given** o processo está no estado APROVADO
- **When** o Analista clica "Finalizar"
- **Then** exibe modal de confirmação: "Esta ação é irreversível. Os créditos se tornarão definitivos e o Rol será bloqueado para cancelamento. Deseja continuar?"

- **Given** o Analista confirma a finalização
- **When** o sistema processa a transição
- **Then** o estado transiciona para FINALIZADO, o evento `distribuicao.processo.finalizado` é publicado e o evento `distribuicao.rol.processado` é publicado

**Critérios de Aceitação — RF-20:**
- **Given** o processo está no estado CALCULADO
- **When** o Analista clica "Cancelar"
- **Then** exibe campo de justificativa obrigatória (mínimo 10 caracteres)

- **Given** o Analista preenche justificativa com "Dados incorretos no Rol" e confirma
- **When** o sistema processa o cancelamento
- **Then** o estado transiciona para CANCELADO, a justificativa é registrada e o evento `distribuicao.processo.cancelado` é publicado

**Critérios de Aceitação — RF-22:**
- **Given** o processo está no estado CRIADO
- **When** o sistema recebe uma tentativa de transição para APROVADO
- **Then** a transição é rejeitada com erro "Transição inválida: CRIADO → APROVADO"

- **Given** o processo está no estado FINALIZADO
- **When** o sistema recebe uma tentativa de cancelamento
- **Then** o cancelamento é rejeitado com erro "Processo finalizado não pode ser cancelado"

### 5. Tela de Criação com Visualização de Disponibilidade

O Analista deve poder ver quais combinações rubrica+período estão prontas (têm Rol + Verba) antes de criar o processo.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-25 | Na tela de criação, exibir lista de combinações rubrica+período que possuem Rol fechado E Verba disponível, sem processo ativo | Should Have |
| RF-26 | Cada combinação deve mostrar: rubrica (sigla+nome), período, verba líquida disponível, total de execuções do Rol | Should Have |

**Critérios de Aceitação — RF-25:**
- **Given** existem Rol fechado e Verba disponível para RADIO/2026-03 e TV_ABERTA/2026-03, mas já existe processo ativo para RADIO/2026-03
- **When** o Analista abre a tela de criação
- **Then** exibe apenas TV_ABERTA/2026-03 como opção disponível

---

## Experiência do Usuário

### Fluxo Principal — Criar Processo
1. Analista acessa "Distribuição" → "Processos"
2. Clica "Novo Processo"
3. Sistema exibe combinações disponíveis (rubrica+período com Rol+Verba prontos)
4. Analista seleciona uma combinação
5. Sistema cria o processo e redireciona para a tela de detalhes (status: CRIADO)

### Fluxo Principal — Ciclo de Vida
1. Na tela de detalhes (CRIADO), Analista clica "Calcular" → F03 executa → status CALCULADO
2. Analista revisa créditos calculados (exibidos por F03) e clica "Aprovar" → status APROVADO
3. Analista clica "Finalizar" → modal de confirmação → status FINALIZADO

### Fluxo Alternativo — Cancelamento
1. Em qualquer estado pré-FINALIZADO, Analista clica "Cancelar"
2. Preenche justificativa (min 10 caracteres)
3. Confirma → status CANCELADO

### Considerações de UI
- Badges coloridos por status: CRIADO (azul), CALCULADO (amarelo), APROVADO (verde), FINALIZADO (verde escuro), CANCELADO (vermelho)
- Botões de ação visíveis apenas quando a transição é válida
- Modal de confirmação para finalização (irreversível)
- Modal com campo de justificativa para cancelamento
- Paginação na listagem (page/size)
- Filtros com select para rubrica, input YYYY-MM para período, multi-select para status

---

## Restrições Técnicas de Alto Nível

- **Stack:** Java Spring Boot (serviço distribuicao-api, porta 5004)
- Dados no schema `distribuicao` do PostgreSQL (Schema-per-Service)
- Consumo de eventos do RabbitMQ com garantia at-least-once (idempotência no consumidor)
- Publicação de eventos via Outbox Pattern (mesma infraestrutura de outbox do projeto)
- Formato CloudEvents para todos os eventos
- Valores monetários em tipos decimais de alta precisão (nunca float/double)
- Frontend React + Vite (mesmo padrão do projeto)

---

## Permissionamento (ecad-authz)

Todos os endpoints expostos pela feature DEVEM ser protegidos com `@RequiresPermission(<key>)` do `authz-spring-boot-starter` (ADR 0003 — backend autoritativo). A resolução é feita por chamada ao serviço externo `ecad-authz` (com cache local + Redis); papéis NÃO são checados localmente. O catálogo de permissões da Distribuição deve ser publicado em `services/distribuicao-api/distribuicao-api/src/main/resources/permissions.yaml` e documentado em `docs/authz/catalog/distribuicao.md` (mesmo padrão de `arrecadacao.md` / `identificacao.md`).

Convenção: **4 segmentos** `dominio:area:recurso:acao` (ADR 0002). Como toda permissão da feature pertence à área default da Distribuição, usar `distribuicao:default:...`.

### Catálogo de permissões da feature

| key | name | Endpoint(s) | Perfil-base sugerido |
|---|---|---|---|
| `distribuicao:default:processo:listar` | Listar processos | `GET /processos`, `GET /processos/disponiveis` | consultor, analista |
| `distribuicao:default:processo:visualizar` | Visualizar processo | `GET /processos/{id}` | consultor, analista |
| `distribuicao:default:processo:criar` | Criar processo | `POST /processos` | analista |
| `distribuicao:default:processo:calcular` | Disparar cálculo | `POST /processos/{id}/calcular` | analista |
| `distribuicao:default:processo:aprovar` | Aprovar processo | `POST /processos/{id}/aprovar` | analista |
| `distribuicao:default:processo:finalizar` | Finalizar processo | `POST /processos/{id}/finalizar` | analista |
| `distribuicao:default:processo:cancelar` | Cancelar processo | `POST /processos/{id}/cancelar` | analista |

> **Sem permissão**, o starter retorna **403 Forbidden** (não 401). **Sem JWT válido**, o filtro do Spring Security retorna **401 Unauthorized**. Esses dois cenários devem ser cobertos por testes de integração com `MockMvc + JwtRequestPostProcessors` mockando `AuthzDecisionClient`, no padrão de `AuthzPermissionEnforcementTest` em `arrecadacao-tests`.

> **Migração legacy:** o `RubricaController` (F01) ainda usa `@PreAuthorize("hasAnyAuthority(...)")`. Esta feature DEVE migrar o controller existente para `@RequiresPermission` (mapeando `distribuicao:default:rubrica:listar` / `visualizar`), pois ter dois padrões coexistindo no mesmo serviço é exatamente o estado contra o qual o ADR 0002 foi escrito.

### BFF / Frontend

Conforme ADR 0004, o BFF expõe ao frontend as permissions do usuário; o módulo `processos` deve esconder ações no `ProcessoActions` baseado nelas (ex: botão "Aprovar" só aparece se `distribuicao:default:processo:aprovar` está presente). A proteção REAL é no backend — UI é apenas UX.

---

## Auditoria (audit-sdk)

Toda operação de escrita DEVE registrar evento(s) de auditoria via `AuditClient` do `audit-sdk-spring-boot-starter` (já presente no `pom.xml` da `distribuicao-api`; tabela `distribuicao.audit_outbox` já provisionada pela migration `V4__create_audit_outbox.sql`). Padrão a seguir é o de `CriarUsuarioMusicaCommandHandler` em arrecadacao-application:

1. Handler injeta `AuditClient`, `AuditContextProvider` (helper local) e uma factory específica `ProcessoAuditEventFactory`.
2. Dentro da mesma transação (`@Transactional`) do comando, chama:
   - `auditClient.publish(factory.userAction(processo, ctx, OPERATION))` — registra a AÇÃO do analista (CREATE/CALCULATE/APPROVE/FINALIZE/CANCEL).
   - `auditClient.publish(factory.dataChange(change, ctx))` — registra ANTES/DEPOIS do estado da entidade (delta de status, justificativa de cancelamento etc.).
3. O `RabbitAuditOutboxRelay` (do starter) publica de forma assíncrona para o exchange `audit.events.exchange.v1` (routing key `audit.event.v1`). Frontend `frontend/src/features/auditoria/` consome essa stream.

### Ações auditadas pela feature

| Ação do analista | OPERATION (enum) | userAction publicado? | dataChange publicado? | Observação |
|---|---|---|---|---|
| Criar processo (`POST /processos`) | `CREATE` | sim | sim (before=null, after=novo processo) | obrigatório |
| Calcular (`POST /processos/{id}/calcular`) | `CALCULATE` | sim | sim (status CRIADO→CALCULADO + totalExecucoes) | mesmo sendo stub na F02 |
| Aprovar (`POST /processos/{id}/aprovar`) | `APPROVE` | sim | sim (status CALCULADO→APROVADO) | obrigatório |
| Finalizar (`POST /processos/{id}/finalizar`) | `FINALIZE` | sim | sim (status APROVADO→FINALIZADO) | ação irreversível — auditoria crítica |
| Cancelar (`POST /processos/{id}/cancelar`) | `CANCEL` | sim | sim (status anterior→CANCELADO + justificativa) | justificativa entra no payload |
| Consumo de evento `rol.fechado/cancelado` | `SYSTEM_EVENT` | NÃO | NÃO | evento do sistema, não auditado (snapshots locais são read-model) |
| Consumo de evento `verba.disponivel` | `SYSTEM_EVENT` | NÃO | NÃO | idem |

### Dados capturados (do `AuditContext`)

O `AuditContextProvider.current(autor)` deve preencher: `userId`, `username`, `displayName`, `roles`, `authProvider`, `ip`, `userAgent`, `traceId`, `requestId`, `userSessionId`, `screenAccessId`, `commandId`, `screenId`, `screenName`, `route`, `channel`. A maior parte vem do JWT + headers; o serviço só precisa portar o `AuditContextProvider` de `arrecadacao-application` (ou criar equivalente).

### Critérios de aceitação — auditoria

- **RF-AUD-01:** Cada ação da tabela acima gera 1 `userAction` + 1 `dataChange` em `distribuicao.audit_outbox` na mesma transação do comando.
- **RF-AUD-02:** Falha na chamada ao `auditClient` NÃO bloqueia o comando (o starter encapsula o I/O; o write na tabela é local e transacional).
- **RF-AUD-03:** Testes de integração devem verificar que `audit_outbox` recebe os registros esperados após cada cenário de fluxo completo (criar → calcular → aprovar → finalizar; criar → cancelar).
- **RF-AUD-04:** Eventos com `eventType=USER_ACTION` devem carregar `userAction.actionCode` derivado da OPERATION (ex: `PROCESSO_DISTRIBUICAO_CREATE`, `PROCESSO_DISTRIBUICAO_FINALIZE`).

---

## Não-Objetivos (Fora de Escopo)

- Cálculo de créditos — lógica de split, ponderação e atribuição é da F03
- Retenção de créditos — F04
- Liberação de créditos retidos — F05
- Ajustes por estorno — F06
- Demonstrativo de créditos — F07
- Transição automática de estados (ex: auto-aprovar após cálculo)
- Reprocessamento/recalculação de um processo já calculado (para recalcular, cancela e cria novo)
- Notificações (email, push) para o Analista sobre processos pendentes
- Tela própria de auditoria dentro do módulo `processos` — auditoria é centralizada em `frontend/src/features/auditoria/` (já implementada)
- Auditoria de leitura (`GET`) — apenas comandos de escrita são auditados nesta feature

---

## Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Implementar o fluxo de distribuição com rastreabilidade e controle de estados conforme o Regulamento
- **Perfis:** Analista de Distribuição, Consultor de Distribuição
- **Restrição global:** PoC auto-contida, RabbitMQ como broker, Schema-per-Service
- **Glossário:** Processo de Distribuição — "Operação que cruza verba líquida + rol de execuções de um período/rubrica para calcular créditos"

### Domain Doc (Distribuição — D04)
- **Feature:** F02 — Gestão de Processos de Distribuição
- **Entidade:** Processo de Distribuição (rubrica, período, status, verba líquida, total execuções, analista)
- **Regras referenciadas:**
  - RN-10 — 1 rubrica + 1 período por processo
  - RN-12 — Disparo manual pelo Analista
  - RN-13 — Pré-requisitos: Rol fechado + Verba disponível
  - RN-14 — Publicar `distribuicao.rol.processado` ao finalizar
- **Eventos produzidos:** `distribuicao.processo.criado`, `.aprovado`, `.finalizado`, `.cancelado`, `distribuicao.rol.processado`
- **Eventos consumidos:** `identificacao.rol.fechado`, `identificacao.rol.cancelado`, `arrecadacao.verba.disponivel`
- **Dependências:** F01 (rubricas sincronizadas), Identificação (Rol via evento), Arrecadação (Verba via evento)
- **Ordem de implementação:** Segunda feature do domínio (pré-requisito para F03)

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator` fornecendo este PRD, o `vision.md` e o `domain.md` como contexto.*
