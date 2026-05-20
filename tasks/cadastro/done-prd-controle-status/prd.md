# PRD — F07: Controle de Status

> **Domínio:** Cadastro (D01)
> **Feature ID:** F07
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-01

---

## Visão Geral

Controle de Status é a feature que conecta todas as regras de validação do Cadastro, garantindo que apenas obras e fonogramas completos e validados atinjam o status LIBERADO — condição obrigatória para entrar no fluxo de distribuição. A liberação é uma ação **manual** do Analista via botão "Liberar", que valida automaticamente os pré-requisitos antes de transicionar. Bloqueio também é manual, com justificativa obrigatória para rastreabilidade.

Esta feature também introduz o campo `urlAudio` no fonograma (texto editável com URL) como pré-requisito para liberação, e a transição automática de PENDENTE_VALIDACAO → PENDENTE_DOCUMENTACAO quando as participações conexas atingem 100%.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Zero obras LIBERADAS sem soma titularidades = 100% | Validação no botão "Liberar" impede |
| Zero fonogramas LIBERADOS com obra PENDENTE | Validação no botão "Liberar" impede |
| Rastreabilidade de bloqueios | 100% dos bloqueios com justificativa registrada |
| Transição automática fonograma → PENDENTE_DOCUMENTACAO | Ocorre quando conexos atingem 100% |

---

## Histórias de Usuário

### HU-01 — Liberar obra musical
**Como** Analista de Cadastro,
**eu quero** clicar "Liberar" em uma obra que está completa (titularidades 100% + ISWC),
**para que** ela fique disponível para distribuição e seus fonogramas possam ser liberados.

### HU-02 — Bloquear obra por pendência
**Como** Analista de Cadastro,
**eu quero** bloquear uma obra informando uma justificativa,
**para que** ela seja impedida de participar da distribuição enquanto a pendência não for resolvida.

### HU-03 — Liberar fonograma
**Como** Analista de Cadastro,
**eu quero** clicar "Liberar" em um fonograma que está completo (conexos 100% + ISRC + áudio + obra LIBERADA),
**para que** a gravação fique disponível para identificação e distribuição.

### HU-04 — Registrar URL de áudio
**Como** Analista de Cadastro,
**eu quero** informar a URL do áudio de um fonograma,
**para que** o fonograma possa progredir para LIBERADO.

### HU-05 — Desbloquear obra ou fonograma
**Como** Analista de Cadastro,
**eu quero** desbloquear uma obra ou fonograma que foi bloqueado indevidamente,
**para que** ele retorne ao status anterior e possa seguir o fluxo normal.

---

## Funcionalidades Principais

### 1. Liberação de Obra Musical

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Botão "Liberar" visível na ObraDetailPage quando status = PENDENTE | Must Have |
| RF-02 | Ao clicar, o sistema valida: (a) título preenchido, (b) tipo preenchido, (c) ISWC preenchido, (d) soma das titularidades autorais = 100.0000% (RN-05) | Must Have |
| RF-03 | Se todos os pré-requisitos atendidos: status muda para LIBERADO | Must Have |
| RF-04 | Se algum pré-requisito falhar: exibir lista dos itens pendentes sem transicionar | Must Have |
| RF-05 | Obra pode ser LIBERADA independente do status dos fonogramas vinculados | Must Have |

**Critérios de Aceitação — RF-02:**
- **Given** obra "Meu Bem Querer" com título, tipo LITEROMUSICAL, ISWC T-336305833-4, titularidades: Djavan 60% + Editora X 40% (soma=100%)
- **When** Analista clica "Liberar"
- **Then** status muda para LIBERADO

**Critérios de Aceitação — RF-04:**
- **Given** obra sem ISWC e titularidades soma 80%
- **When** Analista clica "Liberar"
- **Then** sistema exibe: "Não é possível liberar. Pendências: ISWC não obtido; Soma das titularidades (80%) diferente de 100%"

### 2. Bloqueio de Obra Musical

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-06 | Botão "Bloquear" visível quando status = PENDENTE ou LIBERADO | Must Have |
| RF-07 | Ao clicar, modal solicita justificativa (campo texto obrigatório, mínimo 10 caracteres) | Must Have |
| RF-08 | Ao confirmar: status muda para BLOQUEADO, justificativa registrada com data e hora | Must Have |
| RF-09 | Obra BLOQUEADA não pode ser editada (mesmo comportamento de DEPURADA para edição) | Must Have |
| RF-10 | Justificativa de bloqueio visível na tela de detalhe da obra | Must Have |

**Critérios de Aceitação — RF-07:**
- **Given** o Analista clica "Bloquear" na obra "Meu Bem Querer"
- **When** informa justificativa "Conflito de titularidade com processo judicial em andamento"
- **Then** obra muda para BLOQUEADO, justificativa salva com timestamp

### 3. Desbloqueio de Obra Musical

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-11 | Botão "Desbloquear" visível quando status = BLOQUEADO | Must Have |
| RF-12 | Ao confirmar: status retorna para PENDENTE (não volta para LIBERADO diretamente — precisa liberar novamente) | Must Have |
| RF-13 | Registro de desbloqueio com data e hora | Must Have |

### 4. Liberação de Fonograma

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-14 | Botão "Liberar" visível na FonogramaDetailPage quando status = PENDENTE_DOCUMENTACAO | Must Have |
| RF-15 | Ao clicar, o sistema valida: (a) ISRC preenchido, (b) participações conexas soma = 100%, (c) obra vinculada com status LIBERADO, (d) URL de áudio preenchida | Must Have |
| RF-16 | Se todos os pré-requisitos atendidos: status muda para LIBERADO | Must Have |
| RF-17 | Se algum pré-requisito falhar: exibir lista dos itens pendentes | Must Have |
| RF-18 | Fonograma NÃO pode ser liberado se obra vinculada não for LIBERADA | Must Have |

**Critérios de Aceitação — RF-18:**
- **Given** fonograma com ISRC, conexos 100%, áudio preenchido, mas obra PENDENTE
- **When** Analista clica "Liberar"
- **Then** sistema exibe: "Não é possível liberar. Pendências: Obra vinculada não está LIBERADA"

### 5. Transição Automática Fonograma → PENDENTE_DOCUMENTACAO

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-19 | Quando as participações conexas de um fonograma atingem soma = 100% (após POST /calcular), o status transiciona automaticamente de PENDENTE_VALIDACAO para PENDENTE_DOCUMENTACAO | Must Have |
| RF-20 | Se as participações forem alteradas e a soma cair abaixo de 100%, o status retorna para PENDENTE_VALIDACAO | Must Have |

**Critérios de Aceitação — RF-19:**
- **Given** fonograma PENDENTE_VALIDACAO com intérprete + produtor + músico
- **When** Analista clica "Calcular" e soma = 100%
- **Then** status muda automaticamente para PENDENTE_DOCUMENTACAO

### 6. Campo URL de Áudio no Fonograma

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-21 | Campo `urlAudio` no fonograma: texto editável (URL), opcional na criação | Must Have |
| RF-22 | Editável em qualquer status PENDENTE (PENDENTE_VALIDACAO e PENDENTE_DOCUMENTACAO) | Must Have |
| RF-23 | Não editável em LIBERADO ou DEPURADO | Must Have |
| RF-24 | Exibido na FonogramaDetailPage como campo com label "URL do Áudio" | Must Have |
| RF-25 | A URL é pré-requisito para liberação (RF-15d) mas não é validada como URL válida — apenas texto não vazio | Must Have |

### 7. Bloqueio e Desbloqueio de Fonograma

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-26 | Botão "Bloquear" no fonograma quando status = PENDENTE_* ou LIBERADO | Must Have |
| RF-27 | Justificativa obrigatória (texto, mínimo 10 chars) | Must Have |
| RF-28 | Ao confirmar: status muda para BLOQUEADO, justificativa registrada | Must Have |
| RF-29 | Botão "Desbloquear" quando status = BLOQUEADO → retorna para PENDENTE_VALIDACAO | Must Have |
| RF-30 | Fonograma BLOQUEADO não pode ser editado | Must Have |

### 8. Histórico de Bloqueios

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-31 | Cada bloqueio/desbloqueio registrado com: data, justificativa (bloqueio), tipo de ação | Should Have |
| RF-32 | Histórico visível na tela de detalhe como lista cronológica | Should Have |
| RF-33 | Justificativa do último bloqueio exibida como banner na tela de detalhe | Must Have |

---

## Experiência do Usuário

### Fluxo — Liberar Obra
1. Analista acessa ObraDetailPage (status PENDENTE)
2. Verifica: titularidades 100%, ISWC obtido
3. Clica "Liberar" (botão primary com ícone check)
4. Sistema valida → sucesso → toast "Obra liberada com sucesso" → status muda para LIBERADO
5. Ou: sistema lista pendências → toast warning com lista

### Fluxo — Bloquear Obra
1. Analista acessa obra PENDENTE ou LIBERADA
2. Clica "Bloquear" (botão danger)
3. Modal: "Informe a justificativa para o bloqueio" + textarea (obrigatório, mín 10 chars)
4. Confirma → status BLOQUEADO, banner de justificativa exibido

### Fluxo — Liberar Fonograma
1. Analista acessa FonogramaDetailPage (status PENDENTE_DOCUMENTACAO)
2. Verifica: ISRC, conexos 100%, áudio preenchido, obra LIBERADA
3. Clica "Liberar" → sistema valida → sucesso ou lista pendências

### Considerações de UI
- Botão "Liberar": primary (verde accent ou success), ícone CheckCircle
- Botão "Bloquear": danger, ícone Ban
- Botão "Desbloquear": secondary, ícone Unlock
- Banner de bloqueio: `--color-error-container` bg, texto da justificativa, data
- Lista de pendências: modal ou inline com ícones de check/cross por item
- Status BLOQUEADO: badge vermelho (error)
- Indicador de pré-requisitos: checklist visual na tela de detalhe
- Consultor: botões não visíveis

---

## Restrições Técnicas de Alto Nível

- Endpoints dedicados por ação: POST /obras/{id}/liberar, POST /obras/{id}/bloquear, POST /obras/{id}/desbloquear
- Endpoints fonograma: POST /fonogramas/{id}/liberar, POST /fonogramas/{id}/bloquear, POST /fonogramas/{id}/desbloquear
- Campo `urlAudio` no fonograma: VARCHAR(500), nullable
- Histórico de bloqueios: tabela `historico_bloqueios` (entidade_tipo, entidade_id, acao, justificativa, data)
- Transição automática PENDENTE_VALIDACAO → PENDENTE_DOCUMENTACAO no CalcularPercentuaisCommandHandler (F06)
- Adição de status BLOQUEADO nos enums existentes de fonograma (se não existir)

---

## Não-Objetivos (Fora de Escopo)

- Não dispara eventos ao mudar status (F08)
- Não bloqueia/libera em lote (uma entidade por vez)
- Não implementa workflow de aprovação (apenas Analista decide)
- Não valida URL de áudio como URL válida (apenas texto não vazio)
- Não verifica status de fonogramas ao liberar obra (independentes)
- Não faz liberação automática (sempre via botão manual)

---

## Rastreabilidade

### Domain Doc (Cadastro — D01)
- **Feature:** F07 — Controle de Status
- **Regras referenciadas:** RN-05 (LIBERADO requer titularidades 100%), RN-03 (Produtor obrigatório — via conexos), RN-09 (Intérprete obrigatório — via conexos)
- **Dependências:** Upstream: F03 (Obras), F04 (Titularidades — soma 100%), F05 (Fonogramas — ISRC), F06 (Conexos — soma 100%); Downstream: F08 (Eventos), D02 (Identificação — consome LIBERADOS)
- **Impacto em features existentes:**
  - F03 ObraMusical: adicionar status BLOQUEADO + método Liberar + Bloquear + Desbloquear
  - F05 Fonograma: adicionar status BLOQUEADO + urlAudio + métodos de transição
  - F06 CalcularPercentuaisHandler: disparar transição automática → PENDENTE_DOCUMENTACAO

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`.*

---

## Adendo de Atualização Pós-Análise do Código (2026-05-20)

Este adendo preserva a escrita original e registra apenas o comportamento observado no código atual.

### Status Atual Observado

| Área | Estado observado |
|------|------------------|
| Domínio | `StatusObra.Bloqueado` e `StatusFonograma.Bloqueado` existem; obras e fonogramas têm métodos de liberar, bloquear e desbloquear; fonogramas têm `urlAudio` e `bloqueioJustificativa`. |
| Backend/API | Endpoints de liberar, bloquear, desbloquear e histórico foram implementados dentro de `ObraEndpoints` e `FonogramaEndpoints`. Fonograma também tem `PATCH /api/v1/fonogramas/{id}/url-audio`. |
| Frontend | `ObraDetailPage` e `FonogramaDetailPage` exibem botões contextuais por permissão, modal de bloqueio, banner de bloqueio, checklist de pendências e histórico. `FonogramaForm` exibe o campo "URL do Áudio". |
| Rastreabilidade | Bloqueios e desbloqueios gravam `historico_bloqueios`; a resposta principal retorna `bloqueioJustificativa`. |
| Autorização | As ações usam permissões granulares `cadastro:default:status:*` no backend, frontend e seeds de permissões/papéis. |
| Eventos e auditoria | Liberação e bloqueio de obra/fonograma registram eventos no outbox; liberar, bloquear e desbloquear também publicam auditoria. |

### Atualizações Funcionais Relevantes

- O código atual adicionou publicação de eventos para liberação e bloqueio, embora o texto original liste eventos como fora de escopo.
- `urlAudio` pode ser atualizado pelo `PUT /fonogramas/{id}` e também pelo endpoint dedicado `PATCH /fonogramas/{id}/url-audio`.
- Fonograma BLOQUEADO não pode editar `urlAudio`; essa restrição está coerente com RF-30, mesmo sendo mais explícita que RF-22/RF-23.
- A validação de URL continua sendo essencialmente de presença para liberação; o backend não valida formato de URL. O frontend usa `input type="url"`, mas a garantia de domínio/API permanece "texto não vazio" para liberação.
- A visibilidade dos botões é governada por permissões específicas, não apenas por perfil fixo de Analista/Consultor.

### Divergências e Pendências Observadas

| Item | Observação |
|------|------------|
| Liberação manual de obra | `ObterIswcCommandHandler` ainda chama `obra.AtribuirIswc(iswc)`, e `AtribuirIswc` muda a obra para LIBERADO. Isso mantém um caminho de liberação automática ao obter ISWC, sem passar pelo botão `Liberar` e sem executar o checklist completo de `ValidadorLiberacaoObra`. |
| RF-20 | O retorno automático de fonograma para PENDENTE_VALIDACAO está implementado ao remover participação calculada, mas não foi observado de forma consistente nos fluxos de adicionar ou ajustar participação. |
| Botão Liberar no fonograma | A tela de detalhe mostra "Liberar" para fonograma não liberado, não depurado e não bloqueado; portanto pode aparecer também em PENDENTE_VALIDACAO. O backend bloqueia a ação com 409 quando não está em PENDENTE_DOCUMENTACAO. |
| Cobertura de testes | Há testes unitários de domínio e integração parcial, mas não foi encontrado teste dedicado para `ValidadorLiberacaoFonograma` nem suíte de integração cobrindo todos os endpoints de status. |

### Decisão de Produto Atualizada

Para considerar F07 plenamente aderente ao PRD original, o fluxo de obtenção de ISWC deve deixar de liberar a obra automaticamente ou o PRD deve aceitar explicitamente esse caminho alternativo. Sem essa decisão, a regra "liberação sempre manual" permanece parcialmente divergente do código atual.
