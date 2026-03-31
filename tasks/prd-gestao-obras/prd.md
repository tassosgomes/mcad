# PRD — F03: Gestão de Obras Musicais

> **Domínio:** Cadastro (D01)
> **Feature ID:** F03
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-03-30

---

## Visão Geral

Obras Musicais são o ativo central do domínio Cadastro — toda a cadeia de distribuição de direitos autorais parte de uma obra. Sem um cadastro de obras validado, não há como vincular titulares (F04), registrar fonogramas (F05) ou identificar execuções (D02).

Esta feature implementa o CRUD de obras musicais com ciclo de vida de rascunho e **mecanismo de depuração**: a obra nasce como PENDENTE (rascunho) e só pode progredir para LIBERADO quando tiver titularidades autorais validadas (F04/F07). Obras LIBERADAS que sofrem alteração de título ou titulares são **depuradas** — a obra original torna-se imutável (DEPURADA) e uma nova obra é criada automaticamente com os dados atualizados, necessitando obter novo ISWC.

O ISWC (código internacional) não é digitado manualmente, mas obtido via integração com **API externa** a partir do título, titulares e associação.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Cadastro completo de obras com dados obrigatórios | 100% das obras com título e tipo preenchidos |
| ISWC obtido via integração (não manual) | 100% dos ISWCs vêm da API externa, zero digitação manual |
| Unicidade de ISWC garantida | Zero duplicatas de ISWC no banco |
| Listagem performática | Paginação server-side com resposta < 500ms |
| Obra como rascunho até validação completa | 100% das obras nascem como PENDENTE |

---

## Histórias de Usuário

### HU-01 — Criar obra musical
**Como** Analista de Cadastro,
**eu quero** criar uma obra musical informando título, tipo e gênero,
**para que** ela exista no sistema como rascunho (PENDENTE) e possa receber titulares e fonogramas depois.

### HU-02 — Obter ISWC via API
**Como** Analista de Cadastro,
**eu quero** clicar em "Obter ISWC" na obra que já possui titulares autorais vinculados,
**para que** o sistema obtenha automaticamente o código ISWC da API externa sem que eu precise digitá-lo.

### HU-03 — Buscar obra na listagem
**Como** Analista de Cadastro ou Consultor,
**eu quero** buscar obras por título, ISWC, tipo, status ou gênero com paginação e ordenação,
**para que** eu encontre rapidamente a obra que preciso.

### HU-04 — Editar dados da obra
**Como** Analista de Cadastro,
**eu quero** editar título, subtítulo, tipo e gênero de uma obra existente,
**para que** informações incorretas ou incompletas sejam corrigidas.

### HU-05 — Marcar obra como Domínio Público
**Como** Analista de Cadastro,
**eu quero** marcar uma obra como Domínio Público via flag manual,
**para que** ela seja identificada como sem proteção patrimonial (sem gerar créditos na distribuição).

---

## Funcionalidades Principais

### 1. Criação de Obra Musical

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | O sistema deve permitir criar uma obra informando: título (obrigatório), tipo (obrigatório: MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI), gênero (opcional, texto livre), subtítulo (opcional) | Must Have |
| RF-02 | Status inicial da obra é PENDENTE (rascunho — aguardando titularidades) | Must Have |
| RF-03 | ISWC NÃO é informado na criação — é obtido posteriormente via integração (RF-09) | Must Have |

**Critérios de Aceitação — RF-01:**
- **Given** o Analista preenche título "Meu Bem Querer" e tipo "LITEROMUSICAL"
- **When** clica em Salvar
- **Then** a obra é criada com status PENDENTE, ISWC null, e aparece na listagem

**Critérios de Aceitação — RF-02:**
- **Given** uma obra acabou de ser criada
- **When** consulta o status
- **Then** status é PENDENTE (não LIBERADO)

### 2. Edição de Obra

#### 2a. Obra PENDENTE (sem ISWC) — edição livre

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-04 | Obra com status PENDENTE pode ter título, subtítulo, tipo e gênero editados livremente | Must Have |
| RF-05 | ISWC NÃO pode ser editado manualmente em nenhum status (é gerenciado pela integração) | Must Have |

**Critérios de Aceitação — RF-04:**
- **Given** uma obra com status PENDENTE e sem ISWC
- **When** o Analista altera o título de "Rascunho 1" para "Meu Bem Querer"
- **Then** o título é atualizado normalmente, status permanece PENDENTE

#### 2b. Obra LIBERADA — depuração automática

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-06 | Se a obra tem status LIBERADO (possui ISWC) e o Analista tenta alterar título ou lista de titulares, o sistema exibe alerta: "Esta alteração irá depurar a obra atual e criar uma nova obra. A obra original ficará imutável com status DEPURADA. Deseja continuar?" | Must Have |
| RF-07 | Ao confirmar, o sistema: (1) muda o status da obra original para DEPURADA, (2) torna a obra original imutável, (3) cria automaticamente uma nova obra com os dados atualizados e status PENDENTE (sem ISWC), (4) registra na obra depurada a referência (ID) da nova obra criada | Must Have |
| RF-08 | A obra depurada mantém: ISWC original, título original, titulares originais, fonogramas vinculados (NÃO migram). É somente leitura — nenhum campo pode ser editado. | Must Have |
| RF-09 | A nova obra nasce como PENDENTE, sem ISWC, sem fonogramas. Precisa obter novo ISWC via RF-11. | Must Have |
| RF-10 | Campos subtítulo, tipo e gênero podem ser editados em obra LIBERADA sem disparar depuração (apenas título e titulares disparam) | Must Have |

**Critérios de Aceitação — RF-06:**
- **Given** a obra "Meu Bem Querer" tem status LIBERADO e ISWC "T-336305833-4"
- **When** o Analista tenta alterar o título para "Meu Bem Querer (Remix)"
- **Then** o sistema exibe modal de confirmação: "Esta alteração irá depurar a obra atual e criar uma nova obra..."

**Critérios de Aceitação — RF-07:**
- **Given** o Analista confirma a depuração da obra "Meu Bem Querer"
- **When** o sistema processa a depuração
- **Then** a obra original tem status DEPURADA, ISWC "T-336305833-4", é imutável, e possui campo `obraDepuradaParaId` apontando para a nova obra
- **And** a nova obra "Meu Bem Querer (Remix)" tem status PENDENTE, ISWC null, sem fonogramas

**Critérios de Aceitação — RF-08:**
- **Given** uma obra com status DEPURADA
- **When** o Analista tenta editar qualquer campo
- **Then** todos os campos estão desabilitados (read-only)
- **And** a tela exibe link para a nova obra: "Esta obra foi depurada. Nova versão: [link]"

### 3. Listagem com Paginação, Filtros e Ordenação

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-11 | Listagem de obras com paginação server-side (page/size, default 20) | Must Have |
| RF-12 | Ordenação server-side por: título (default ASC), tipo, status | Must Have |
| RF-13 | Filtros: título (parcial, case-insensitive), ISWC (parcial), tipo (exato), status (exato incluindo DEPURADA), gênero (parcial) | Must Have |
| RF-14 | A listagem exibe: título, tipo, gênero, ISWC (mono, ou "—" se null), status (badge), link para nova obra (se DEPURADA) | Must Have |

**Critérios de Aceitação — RF-13:**
- **Given** existem obras "Meu Bem Querer", "Meu Caro Amigo" e "Andar com Fé"
- **When** o usuário filtra por título "meu"
- **Then** retorna "Meu Bem Querer" e "Meu Caro Amigo" (case-insensitive, parcial)

### 4. Obtenção de ISWC via API Externa

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-15 | Botão "Obter ISWC" visível na tela de detalhe/edição da obra (apenas status PENDENTE) | Must Have |
| RF-16 | O botão só é habilitado se a obra tiver ao menos um titular autoral vinculado (F04) | Must Have |
| RF-17 | Ao clicar, o sistema chama a API `https://iswc.tasso.dev.br/` enviando: `work_title` (título da obra), `authors` (nomes de TODOS os titulares autorais), `association_code` (sigla da associação do titular com maior percentual; se empate, o primeiro) | Must Have |
| RF-18 | O ISWC retornado pela API é salvo automaticamente na obra | Must Have |
| RF-19 | Se a API retornar erro ou estiver indisponível, exibir mensagem amigável: "Não foi possível obter o ISWC neste momento. Por favor, tente novamente mais tarde." | Must Have |
| RF-20 | Se a obra já possui ISWC, o botão exibe "ISWC Obtido" (desabilitado) | Should Have |
| RF-21 | ISWC é único no sistema — se a API retornar um ISWC que já existe em outra obra, rejeitar com erro claro | Must Have |
| RF-22 | Botão "Obter ISWC" NÃO aparece em obras com status DEPURADA ou DOMINIO_PUBLICO | Must Have |

**Critérios de Aceitação — RF-17:**
- **Given** a obra "Meu Bem Querer" tem titulares: Djavan (60%, associação ABRAMUS) e Editora X (40%, associação UBC)
- **When** o Analista clica em "Obter ISWC"
- **Then** o sistema envia para a API: `{ "work_title": "Meu Bem Querer", "authors": ["Djavan", "Editora X"], "association_code": "ABRAMUS" }` (ABRAMUS porque Djavan tem 60%, maior percentual)

**Critérios de Aceitação — RF-19:**
- **Given** a API de ISWC está indisponível (timeout ou 5xx)
- **When** o Analista clica em "Obter ISWC"
- **Then** exibe toast: "Não foi possível obter o ISWC neste momento. Por favor, tente novamente mais tarde."
- **And** o campo ISWC permanece null

**Critérios de Aceitação — RF-16:**
- **Given** a obra "Sem Título" não possui titulares autorais
- **When** o Analista visualiza a tela da obra
- **Then** o botão "Obter ISWC" está desabilitado com tooltip "Adicione titulares autorais antes de obter o ISWC"

### 5. Domínio Público (RN-06)

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-23 | Flag manual "Domínio Público" na tela de edição da obra (apenas status PENDENTE ou LIBERADO) | Must Have |
| RF-24 | Ao marcar como Domínio Público, o status muda para DOMINIO_PUBLICO | Must Have |
| RF-25 | Ao desmarcar, o status retorna ao anterior (PENDENTE ou LIBERADO conforme titularidades) | Should Have |
| RF-26 | Flag não disponível para obras DEPURADAS | Must Have |

**Critérios de Aceitação — RF-24:**
- **Given** uma obra com status PENDENTE
- **When** o Analista marca "Domínio Público"
- **Then** o status muda para DOMINIO_PUBLICO

### 6. Consulta e Exclusão

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-27 | API de consulta individual por ID retornando todos os dados da obra (incluindo `obraDepuradaParaId` se DEPURADA) | Must Have |
| RF-28 | Retornar 404 se o ID não existir | Must Have |
| RF-29 | Impedir exclusão de obra que tenha fonogramas vinculados | Should Have |
| RF-30 | Impedir exclusão de obra que tenha titularidades autorais vinculadas | Should Have |
| RF-31 | Impedir exclusão de obra com status DEPURADA (imutável) | Must Have |
| RF-32 | Se a obra não possuir vínculos e não for DEPURADA, permitir exclusão permanente | Should Have |

**Critérios de Aceitação — RF-29:**
- **Given** a obra "Meu Bem Querer" tem o fonograma "Meu Bem Querer - Ao Vivo" vinculado
- **When** o Analista tenta excluir a obra
- **Then** o sistema rejeita: "Obra não pode ser excluída pois possui fonogramas vinculados"

**Critérios de Aceitação — RF-31:**
- **Given** uma obra com status DEPURADA
- **When** o Analista tenta excluir
- **Then** o sistema rejeita: "Obras depuradas não podem ser excluídas"

---

## Experiência do Usuário

### Fluxo Principal — Criar Obra
1. Analista acessa "Cadastro > Obras" na sidebar
2. Clica em "Nova Obra"
3. Preenche título, seleciona tipo, opcionalmente preenche gênero e subtítulo
4. Clica "Salvar"
5. Obra criada como PENDENTE, redireciona para detalhe

### Fluxo Principal — Obter ISWC
1. Analista acessa a obra (que já tem titulares autorais via F04)
2. Vê botão "Obter ISWC" habilitado
3. Clica no botão → loading spinner no botão
4. ISWC preenchido automaticamente → toast "ISWC obtido com sucesso"
5. Se erro → toast amigável, botão volta ao estado normal

### Fluxo Principal — Depuração
1. Analista acessa uma obra LIBERADA (com ISWC)
2. Altera o título (ou a lista de titulares muda via F04)
3. Sistema exibe modal: "Esta alteração irá depurar a obra atual e criar uma nova obra. A obra original ficará imutável com status DEPURADA. Deseja continuar?"
4. Analista confirma
5. Obra original → status DEPURADA, imutável, com link para nova obra
6. Nova obra criada → status PENDENTE, sem ISWC, dados atualizados
7. Analista é redirecionado para a nova obra

### Fluxo de Consulta — Obra Depurada
1. Usuário acessa obra com status DEPURADA
2. Todos os campos estão read-only
3. Banner no topo: "Esta obra foi depurada em [data]. Nova versão: [link para nova obra]"
4. Sem botões de ação (editar, excluir, obter ISWC)

### Considerações de UI
- Tipo da obra como Select (4 opções fixas)
- Gênero como TextInput (texto livre)
- ISWC exibido em `--font-mono` (JetBrains Mono), read-only, com botão "Obter ISWC" ao lado
- Status como Badge: PENDENTE (warning), LIBERADO (success), BLOQUEADO (error), DOMINIO_PUBLICO (muted), DEPURADA (secondary)
- Flag Domínio Público como toggle/checkbox na edição (oculto se DEPURADA)
- Obra DEPURADA: todos os campos read-only + banner "Esta obra foi depurada" + link para nova obra
- Modal de confirmação antes de depurar: "Esta alteração irá depurar a obra atual e criar uma nova obra..."
- Consultor vê os mesmos dados sem botões de ação

---

## Restrições Técnicas de Alto Nível

- Integração com API externa: `https://iswc.tasso.dev.br/` (POST, JSON)
- Timeout da API ISWC: 10 segundos (falhar graciosamente)
- ISWC armazenado como string (formato: `T-XXXXXXXXX-X`)
- Schema `cadastro` no PostgreSQL
- Paginação e filtros server-side

---

## Não-Objetivos (Fora de Escopo)

- Não gerencia titularidades autorais nesta feature (F04)
- Não gerencia fonogramas nesta feature (F05)
- Não calcula automaticamente transição de status para LIBERADO (será F07)
- Não valida soma de titularidades = 100% (será F04)
- Não faz verificação inteligente de duplicidade (fuzzy matching)
- Não permite edição manual do ISWC
- Não implementa cache da API de ISWC
- Não inclui importação em lote de obras
- Não migra fonogramas automaticamente da obra depurada para a nova obra (revinculação manual se necessário)

---

## Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Cadastro centralizado de obras musicais como base para Identificação e Distribuição
- **Perfis:** Analista de Cadastro, Consultor
- **Glossário:** Obra Musical, ISWC

### Domain Doc (Cadastro — D01)
- **Feature:** F03 — Gestão de Obras Musicais
- **Entidade:** Obra Musical
- **Regras referenciadas:** RN-02 (unicidade título+titulares — validada na atribuição do ISWC), RN-05 (LIBERADO requer titularidades — será F07), RN-06 (Domínio Público via flag manual)
- **Regra nova:** Depuração — obra LIBERADA que sofre alteração de título ou titulares é depurada (imutável) e gera nova obra automaticamente
- **Dependências:** Upstream: F02 (Titulares — necessários para obter ISWC); Downstream: F04 (Titularidades Autorais), F05 (Fonogramas)

### Integração Externa
- **API ISWC:** `https://iswc.tasso.dev.br/`
- **Método:** POST
- **Request:** `{ "association_code": string, "work_title": string, "authors": string[] }`
- **Response:** `{ "iswc": string, "work_title": string, "authors": string[], "association_code": string, "created_at": string }`
- **Regra de seleção da associação:** Sigla da associação do titular com maior percentual. Em caso de empate, o primeiro.

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `techspec-creator` fornecendo este PRD, o `vision.md` e o `domain.md` como contexto.*
