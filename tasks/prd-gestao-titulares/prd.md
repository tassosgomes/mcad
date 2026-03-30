# PRD — F02: Gestão de Titulares

> **Domínio:** Cadastro (D01)
> **Feature ID:** F02
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-03-30

---

## Visão Geral

Titulares são o elo central do domínio Cadastro — toda obra musical tem autores, todo fonograma tem intérpretes e produtores. Sem um cadastro de titulares validado e íntegro, os domínios de Identificação e Distribuição não conseguem operar: a distribuição depende de saber exatamente quem detém qual percentual de qual obra/fonograma.

Esta feature implementa o CRUD completo de titulares (pessoas físicas e jurídicas), com validação rigorosa de CPF e CNPJ (incluindo o novo formato alfanumérico da RFB), vínculo obrigatório com uma das 7 associações de gestão coletiva, e listagem paginada com filtros e ordenação server-side.

**Nota importante:** As categorias autorais (Autor, Editor) e conexas (Intérprete, Produtor, Músico) NÃO são atributos do titular — são definidas no momento do vínculo com obra (F04) ou fonograma (F05/F06). Um mesmo titular pode ser Autor em uma obra e Intérprete em um fonograma.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Cadastro íntegro de titulares PF e PJ | 100% dos titulares com CPF ou CNPJ válido (sem registros com documento inválido) |
| Unicidade de documentos garantida | Zero duplicatas de CPF/CNPJ no banco |
| Vínculo com associação obrigatório | 100% dos titulares vinculados a uma das 7 associações |
| Listagem performática com volume razoável | Paginação server-side com resposta < 500ms para 1.000 registros |
| Filtros e ordenação úteis | Analista consegue encontrar titular por nome parcial ou CPF/CNPJ em até 2 interações |

---

## Histórias de Usuário

### HU-01 — Cadastrar titular pessoa física
**Como** Analista de Cadastro,
**eu quero** cadastrar um titular pessoa física com nome, CPF, nacionalidade e associação,
**para que** ele possa ser vinculado como autor, intérprete ou músico em obras e fonogramas.

### HU-02 — Cadastrar titular pessoa jurídica
**Como** Analista de Cadastro,
**eu quero** cadastrar um titular pessoa jurídica com razão social, CNPJ (incluindo alfanumérico) e associação,
**para que** ele possa ser vinculado como editor ou produtor fonográfico.

### HU-03 — Buscar titular na listagem
**Como** Analista de Cadastro ou Consultor,
**eu quero** buscar titulares por nome parcial, CPF/CNPJ, associação ou status, com paginação e ordenação,
**para que** eu encontre rapidamente o titular que preciso sem percorrer toda a lista.

### HU-04 — Editar dados de um titular
**Como** Analista de Cadastro,
**eu quero** editar os dados de um titular existente (nome, nacionalidade, associação, status, CAE/IPI),
**para que** informações incorretas ou desatualizadas sejam corrigidas.

### HU-05 — Visualizar detalhes do titular
**Como** Consultor,
**eu quero** visualizar os dados completos de um titular sem poder editá-los,
**para que** eu possa conferir informações cadastrais em modo read-only.

---

## Funcionalidades Principais

### 1. Criação de Titular

Formulário para cadastrar um novo titular com validações em tempo real.

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | O sistema deve permitir criar um titular informando: nome, tipo (PF/PJ), CPF ou CNPJ, nacionalidade, associação e opcionalmente CAE/IPI | Must Have |
| RF-02 | Se o tipo for PF, o campo CPF é obrigatório e deve ser validado pelo algoritmo módulo 11 (numérico) | Must Have |
| RF-03 | Se o tipo for PJ, o campo CNPJ é obrigatório e deve ser validado pelo algoritmo módulo 11 alfanumérico conforme nova regra da RFB (retrocompatível com CNPJs numéricos existentes) | Must Have |
| RF-04 | CPF e CNPJ devem ser implementados como Value Objects com validação embutida | Must Have |
| RF-05 | CPF/CNPJ deve ser único no sistema — tentativa de cadastrar documento duplicado retorna erro claro | Must Have |
| RF-06 | Associação é obrigatória — seleção via dropdown das 7 associações do seed (F01) | Must Have |
| RF-07 | Nacionalidade é obrigatória | Must Have |
| RF-08 | Status inicial do titular é ATIVO (default) | Must Have |
| RF-09 | CAE/IPI é opcional (nem todos os titulares possuem código internacional) | Must Have |

**Critérios de Aceitação — RF-02 (Validação CPF):**
- **Given** o tipo do titular é PF
- **When** o Analista informa um CPF com dígitos verificadores inválidos
- **Then** o sistema rejeita com mensagem: "CPF inválido"

**Critérios de Aceitação — RF-03 (Validação CNPJ alfanumérico):**
- **Given** o tipo do titular é PJ
- **When** o Analista informa um CNPJ alfanumérico (ex: `12ABC34501DE06`) com dígitos verificadores calculados conforme regra RFB (ASCII - 48, pesos módulo 11)
- **Then** o sistema aceita o CNPJ como válido

- **Given** o tipo do titular é PJ
- **When** o Analista informa um CNPJ no formato numérico legado (ex: `11222333000181`)
- **Then** o sistema aceita o CNPJ como válido (retrocompatibilidade)

**Critérios de Aceitação — RF-05 (Unicidade):**
- **Given** já existe um titular com CPF `123.456.789-09`
- **When** o Analista tenta cadastrar outro titular com o mesmo CPF
- **Then** o sistema rejeita com mensagem: "Já existe um titular cadastrado com este CPF"

### 2. Edição de Titular

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-10 | O Analista de Cadastro pode editar: nome, nacionalidade, associação, status e CAE/IPI | Must Have |
| RF-11 | O tipo (PF/PJ) e o documento (CPF/CNPJ) NÃO podem ser alterados após criação | Must Have |
| RF-12 | O status pode ser alterado para: ATIVO, FALECIDO ou TRANSFERINDO | Must Have |

**Critérios de Aceitação — RF-11:**
- **Given** um titular PF com CPF `123.456.789-09`
- **When** o Analista tenta alterar o tipo para PJ ou modificar o CPF
- **Then** os campos tipo e documento estão desabilitados (não editáveis)

### 3. Listagem com Paginação, Filtros e Ordenação

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-13 | Listagem de titulares com paginação server-side (parâmetros: page, size; default size=20) | Must Have |
| RF-14 | Ordenação server-side por: nome (default ASC), sigla da associação, status | Must Have |
| RF-15 | Filtro por nome (busca parcial, case-insensitive) | Must Have |
| RF-16 | Filtro por CPF/CNPJ (busca parcial, apenas dígitos) | Must Have |
| RF-17 | Filtro por associação (seleção exata via dropdown) | Must Have |
| RF-18 | Filtro por status (seleção exata: ATIVO, FALECIDO, TRANSFERINDO) | Must Have |
| RF-19 | A listagem exibe: nome, tipo (PF/PJ), CPF/CNPJ formatado, associação (sigla), status | Must Have |
| RF-20 | Colunas da tabela são clicáveis para alternar ordenação (ASC/DESC) | Should Have |

**Critérios de Aceitação — RF-13:**
- **Given** existem 50 titulares cadastrados
- **When** o usuário acessa a listagem sem parâmetros
- **Then** retorna os primeiros 20 titulares ordenados por nome ASC, com metadados de paginação (page, size, total, totalPages)

**Critérios de Aceitação — RF-15:**
- **Given** existem titulares "Djavan", "Djonga" e "Ana Carolina"
- **When** o usuário filtra por nome "dj"
- **Then** retorna "Djavan" e "Djonga" (case-insensitive, parcial)

### 4. Consulta Individual

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-21 | API de consulta individual por ID retornando todos os dados do titular | Must Have |
| RF-22 | Retornar 404 se o ID não existir | Must Have |

### 5. Exclusão

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-23 | O sistema deve impedir a exclusão de um titular que esteja vinculado a alguma obra (titularidade autoral) ou fonograma (participação conexa) | Should Have |
| RF-24 | Se o titular não possuir vínculos, permitir exclusão permanente | Should Have |

**Critérios de Aceitação — RF-23:**
- **Given** o titular "Djavan" está vinculado como autor da obra "Meu Bem Querer"
- **When** o Analista tenta excluir o titular "Djavan"
- **Then** o sistema rejeita com mensagem: "Titular não pode ser excluído pois possui vínculos com obras ou fonogramas"

---

## Experiência do Usuário

### Fluxo Principal — Cadastrar Titular
1. Analista acessa "Cadastro > Titulares" na sidebar
2. Clica em "Novo Titular"
3. Seleciona tipo: Pessoa Física ou Pessoa Jurídica
4. Preenche nome, CPF/CNPJ (validação em tempo real), nacionalidade
5. Seleciona associação no dropdown (7 opções)
6. Opcionalmente preenche CAE/IPI
7. Clica "Salvar"
8. Sistema valida, cria o titular e redireciona para a listagem com mensagem de sucesso

### Fluxo Principal — Buscar Titular
1. Usuário acessa "Cadastro > Titulares"
2. Vê a listagem paginada (20 por página)
3. Digita no campo de busca ou seleciona filtros (associação, status)
4. Lista atualiza automaticamente (com debounce no campo de texto)
5. Clica no titular para ver detalhes / editar

### Considerações de UI
- CPF exibido formatado: `000.000.000-00`
- CNPJ numérico formatado: `00.000.000/0001-00`
- CNPJ alfanumérico formatado: `A1.B2C.3D4/1A2B-99`
- CPF/CNPJ em `--font-mono` (JetBrains Mono)
- Validação inline no formulário (feedback imediato ao perder foco do campo)
- Consultor vê os mesmos dados mas sem botões de ação (criar, editar, excluir)
- Indicador visual do tipo PF/PJ (badge ou ícone)
- Sigla da associação como chip/badge (ex: `ABRAMUS`, `UBC`)

---

## Restrições Técnicas de Alto Nível

- CPF e CNPJ como Value Objects no Domain Layer (validação encapsulada, não leakada para camadas externas)
- CNPJ alfanumérico: validação conforme algoritmo módulo 11 com conversão ASCII - 48 (doc `docs/validacoes/cnpj.md`)
- Paginação e ordenação devem ser resolvidas no banco (server-side), não no frontend
- Documento (CPF/CNPJ) armazenado sem formatação (apenas alfanumérico), formatado na exibição
- Schema `cadastro` no PostgreSQL (Schema-per-Service)
- Precisão decimal para qualquer valor percentual (RN-08)

---

## Não-Objetivos (Fora de Escopo)

- Não gerencia categorias autorais/conexas no cadastro do titular (definidas no vínculo: F04, F05, F06)
- Não inclui importação em lote de titulares
- Não inclui histórico de alterações (audit trail)
- Não inclui busca por CAE/IPI
- Não inclui foto ou documentos anexos do titular
- Não inclui autenticação/autorização real (perfis controlados por role no frontend)
- Não inclui validação de CPF/CNPJ contra Receita Federal (apenas validação algorítmica local)

---

## Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Cadastro centralizado de titulares como master data para Identificação e Distribuição
- **Perfis:** Analista de Cadastro, Consultor (conforme Vision Doc seção 1)
- **Restrição global:** PoC auto-contida, sem auth (Non-Goal)

### Domain Doc (Cadastro — D01)
- **Feature:** F02 — Gestão de Titulares
- **Entidades:** Titular, Associação (referência via F01)
- **Regras referenciadas:** RN-07 (acúmulo de papéis — impacta design, não esta feature diretamente), RN-08 (precisão decimal), RN-10 (FALECIDO informativo), RN-11 (Editor exige PJ — validação será em F04, mas tipo PF/PJ é definido aqui)
- **Eventos:** `cadastro.titular.criado` (a ser implementado em F08, mas endpoint de criação deve ser projetado para suportar)
- **Dependências:** Upstream: F01 (Associações); Downstream: F03, F04, F05, F06

---

## Questões em Aberto

- [x] ~~Formato CNPJ alfanumérico~~ → Resolvido: `A1.B2C.3D4/1A2B-99` (posições de pontuação mantidas)
- [x] ~~Nacionalidade~~ → Resolvido: campo texto livre

Todas as questões foram resolvidas. PRD pronto para Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `techspec-creator` fornecendo este PRD, o `vision.md` e o `domain.md` como contexto.*
