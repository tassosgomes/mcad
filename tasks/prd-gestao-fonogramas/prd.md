# PRD — F05: Gestão de Fonogramas

> **Domínio:** Cadastro (D01)
> **Feature ID:** F05
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-03-31

---

## Visão Geral

Fonogramas são o elo entre a composição (obra) e a execução musical — cada fonograma é uma gravação específica de uma obra, identificada internacionalmente pelo código ISRC. Sem fonogramas cadastrados, o domínio de Identificação (D02) não tem como vincular execuções de streaming, rádio e TV a obras e titulares para distribuição de créditos.

Esta feature implementa o CRUD de fonogramas com: ISRC digitado manualmente com validação de formato (`CC-XXX-YY-NNNNN`), vínculo obrigatório a uma obra (FK imutável), mecanismo de depuração similar ao de obras (disparado por alteração de ISRC ou participações conexas), e regras de status interdependentes com a obra vinculada.

**Fonogramas sem obra não existem.** O fonograma pode ser gerenciado em tela própria (`/cadastro/fonogramas`) ou como seção dentro da tela de Obras. A obra vinculada é imutável — trocar de obra requer depuração.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Cadastro de fonogramas com ISRC válido | 100% dos ISRCs seguem formato `CC-XXX-YY-NNNNN` |
| ISRC único no sistema | Zero duplicatas |
| Vínculo obra-fonograma íntegro | 100% dos fonogramas vinculados a uma obra existente |
| Depuração preserva histórico | Fonogramas depurados imutáveis com referência ao novo |
| Interdependência de status correta | Zero fonogramas LIBERADOS com obra PENDENTE |

---

## Histórias de Usuário

### HU-01 — Criar fonograma vinculado a uma obra
**Como** Analista de Cadastro,
**eu quero** criar um fonograma informando ISRC, obra, país de origem, datas de gravação e lançamento,
**para que** a gravação fique registrada e pronta para receber participações conexas.

### HU-02 — Listar fonogramas do sistema
**Como** Analista de Cadastro ou Consultor,
**eu quero** buscar fonogramas por ISRC, obra, status ou país com paginação e ordenação,
**para que** eu encontre o fonograma que preciso.

### HU-03 — Ver fonogramas de uma obra
**Como** Analista de Cadastro,
**eu quero** ver a lista de fonogramas vinculados a uma obra na tela de detalhe da obra,
**para que** eu saiba quais gravações existem para essa composição.

### HU-04 — Editar dados do fonograma
**Como** Analista de Cadastro,
**eu quero** editar país de origem, datas de gravação e lançamento de um fonograma,
**para que** informações incorretas sejam corrigidas sem depuração.

### HU-05 — Depuração ao alterar ISRC
**Como** sistema,
**eu preciso** depurar um fonograma LIBERADO quando o ISRC é alterado,
**para que** o histórico da gravação original seja preservado.

---

## Funcionalidades Principais

### 1. Criação de Fonograma

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Criar fonograma informando: ISRC (obrigatório), obra (obrigatório, select de obras existentes), país de origem (texto livre, obrigatório), data de gravação (opcional), data de lançamento (opcional) | Must Have |
| RF-02 | ISRC deve seguir formato `CC-XXX-YY-NNNNN` (2 letras país, 3 chars registrante, 2 dígitos ano, 5 dígitos número). Validação de formato obrigatória. | Must Have |
| RF-03 | ISRC único no sistema — tentativa de cadastrar ISRC duplicado retorna erro | Must Have |
| RF-04 | Obra é obrigatória — fonograma não existe sem obra | Must Have |
| RF-05 | Status inicial do fonograma é PENDENTE_VALIDACAO | Must Have |

**Critérios de Aceitação — RF-02:**
- **Given** o Analista informa ISRC "BR-ABC-23-12345"
- **When** clica Salvar
- **Then** o sistema aceita (formato válido)

- **Given** o Analista informa ISRC "INVALIDO"
- **When** clica Salvar
- **Then** o sistema rejeita: "ISRC deve seguir formato CC-XXX-YY-NNNNN"

**Critérios de Aceitação — RF-03:**
- **Given** já existe fonograma com ISRC "BR-ABC-23-12345"
- **When** o Analista tenta criar outro com mesmo ISRC
- **Then** o sistema rejeita: "Já existe um fonograma com este ISRC"

### 2. Listagem com Paginação, Filtros e Ordenação

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-06 | Listagem de fonogramas com paginação server-side (page/size, default 20) | Must Have |
| RF-07 | Ordenação server-side por: ISRC (default ASC), obra (título), status | Must Have |
| RF-08 | Filtros: ISRC (parcial), obra (título parcial ou ID), status (exato), país (parcial) | Must Have |
| RF-09 | A listagem exibe: ISRC (mono), título da obra, país, status (badge), data de lançamento | Must Have |

### 3. Fonogramas na Tela de Obras

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-10 | Na tela de detalhe da obra, seção "Fonogramas" exibe a lista de fonogramas vinculados | Must Have |
| RF-11 | Botão "Novo Fonograma" na seção — redireciona para criação com obra pré-selecionada | Must Have |
| RF-12 | Cada fonograma na lista é clicável — navega para tela de detalhe do fonograma | Must Have |
| RF-13 | Para obras DEPURADAS, a seção é read-only | Must Have |

### 4. Edição de Fonograma

#### 4a. Fonograma PENDENTE — edição livre

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-14 | Fonograma PENDENTE pode ter editados: ISRC, país, datas. Obra é imutável. | Must Have |
| RF-15 | Ao alterar ISRC, validar formato e unicidade | Must Have |

#### 4b. Fonograma LIBERADO — depuração

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-16 | Em fonograma LIBERADO, alteração de ISRC dispara confirmação de depuração | Must Have |
| RF-17 | Campos país e datas podem ser editados livremente sem depuração (mesmo em LIBERADO) | Must Have |
| RF-18 | Ao confirmar depuração: fonograma original → DEPURADO (imutável), novo fonograma criado → PENDENTE_VALIDACAO (com dados atualizados, mesma obra) | Must Have |
| RF-19 | Fonograma depurado mantém: ISRC original, participações conexas originais. Possui referência (ID) para o novo fonograma. | Must Have |
| RF-20 | Novo fonograma: sem participações conexas (serão recadastradas em F06) | Must Have |

**Critérios de Aceitação — RF-18:**
- **Given** fonograma "BR-ABC-23-12345" (LIBERADO) da obra "Meu Bem Querer"
- **When** o Analista altera o ISRC para "BR-ABC-23-99999" e confirma depuração
- **Then** fonograma original → DEPURADO, ISRC "BR-ABC-23-12345", imutável, `fonogramaDepuradoParaId` apontando para novo
- **And** novo fonograma → PENDENTE_VALIDACAO, ISRC "BR-ABC-23-99999", mesma obra, sem conexos

### 5. Depuração por Participações Conexas (F06 futuro)

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-21 | Alteração de participações conexas (F06) em fonograma LIBERADO dispara depuração (mesma regra de F04 com titularidades autorais) | Must Have |
| RF-22 | O endpoint de depuração é reutilizável: `POST /fonogramas/{id}/depurar` | Must Have |

### 6. Interdependência de Status com Obra

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-23 | Fonograma não pode ser LIBERADO se a obra vinculada não for LIBERADA | Must Have |
| RF-24 | Obra LIBERADA não pode ter fonograma PENDENTE ao ser liberada (validação em F07) | Must Have |
| RF-25 | Se a obra vinculada for depurada, o fonograma NÃO é depurado — permanece na obra original (que agora é DEPURADA) | Must Have |

**Critérios de Aceitação — RF-23:**
- **Given** fonograma da obra "Rascunho" (status PENDENTE)
- **When** o sistema tenta liberar o fonograma
- **Then** rejeita: "Fonograma não pode ser liberado — obra vinculada não está LIBERADA"

**Critérios de Aceitação — RF-25:**
- **Given** obra "Meu Bem Querer" (LIBERADA) tem fonograma "BR-ABC-23-12345"
- **When** a obra é depurada (F03)
- **Then** o fonograma permanece vinculado à obra original (agora DEPURADA), NÃO migra para nova obra

### 7. Consulta e Exclusão

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-26 | API de consulta individual por ID retornando todos os dados do fonograma (incluindo título da obra e `fonogramaDepuradoParaId`) | Must Have |
| RF-27 | Retornar 404 se não existir | Must Have |
| RF-28 | Exclusão permitida APENAS em status PENDENTE_VALIDACAO ou PENDENTE_DOCUMENTACAO | Must Have |
| RF-29 | Fonograma LIBERADO ou DEPURADO não pode ser excluído | Must Have |

**Critérios de Aceitação — RF-28:**
- **Given** fonograma com status PENDENTE_VALIDACAO
- **When** o Analista exclui
- **Then** o fonograma é removido

- **Given** fonograma com status LIBERADO
- **When** o Analista tenta excluir
- **Then** o sistema rejeita: "Fonogramas liberados não podem ser excluídos"

---

## Experiência do Usuário

### Fluxo Principal — Criar Fonograma
1. Analista acessa "Cadastro > Fonogramas" ou clica "Novo Fonograma" na seção de fonogramas da obra
2. Preenche ISRC (validação de formato em tempo real), seleciona obra (se não pré-selecionada)
3. Preenche país de origem, opcionalmente datas
4. Clica "Salvar" → fonograma criado como PENDENTE_VALIDACAO

### Fluxo — Depuração
1. Analista acessa fonograma LIBERADO
2. Altera o ISRC
3. Modal: "Alterar o ISRC irá depurar este fonograma..."
4. Confirma → original DEPURADO, novo criado
5. Redirect para novo fonograma

### Fluxo — Fonogramas na Obra
1. Analista acessa ObraDetailPage
2. Seção "Fonogramas" exibe lista (ISRC mono, status badge)
3. "Novo Fonograma" → criação com obra pré-selecionada
4. Click no fonograma → navega para `/cadastro/fonogramas/{id}`

### Considerações de UI
- ISRC em `--font-mono` (JetBrains Mono), formato `CC-XXX-YY-NNNNN`
- Status badges: PENDENTE_VALIDACAO (warning), PENDENTE_DOCUMENTACAO (warning), LIBERADO (success), DEPURADO (secondary)
- Fonograma DEPURADO: banner + link para novo (mesmo padrão de obras F03)
- Seção na ObraDetailPage: tabela simples (ISRC, status, país, data), botão "Novo Fonograma"
- Datas em formato ISO (date picker ou input date)
- Consultor: read-only

---

## Restrições Técnicas de Alto Nível

- Tabela `fonogramas` no schema `cadastro` com FK para `obras_musicais`
- ISRC como Value Object (record com validação de formato) — mesmo padrão de CPF/CNPJ
- Self-referencing FK `FonogramaDepuradoParaId` (mesmo padrão de obras)
- Paginação e filtros server-side
- ISRC armazenado sem hífens (apenas alfanumérico), formatado na exibição

---

## Não-Objetivos (Fora de Escopo)

- Não gerencia participações conexas nesta feature (F06)
- Não transiciona status automaticamente para LIBERADO (F07)
- Não obtém ISRC via API externa (digitação manual com validação de formato)
- Não migra fonogramas automaticamente quando obra é depurada (F03)
- Não inclui upload de arquivo de áudio
- Não inclui importação em lote

---

## Rastreabilidade

### Domain Doc (Cadastro — D01)
- **Feature:** F05 — Gestão de Fonogramas
- **Entidade:** Fonograma
- **Regras referenciadas:** RN-03 (ao menos um Produtor — validação em F06), RN-09 (ao menos um Intérprete — validação em F06), RN-08 (precisão decimal para participações futuras)
- **Dependências:** Upstream: F03 (Obras — FK obrigatória), F02 (Titulares — para participações F06); Downstream: F06 (Participação Conexa), F07 (Controle de Status), D02 (Identificação — consulta por ISRC)
- **Integração com depuração:** Fonograma depura por alteração de ISRC ou participações conexas. Se a obra é depurada, fonograma NÃO migra.

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `techspec-creator`.*
