# PRD — F01: Gestão de Captações

> **Domínio:** Identificação (D02)
> **Feature:** F01 — Gestão de Captações
> **Prioridade:** Must Have
> **Status:** `planned`
> **Última revisão:** 2026-04-01

---

## 1. Visão Geral

A Captação é o contêiner fundamental do domínio de Identificação — agrupa todas as execuções musicais registradas para uma rubrica e um dia específico. Sem captações bem estruturadas, o sistema não tem como organizar, identificar e consolidar execuções no Rol de Execuções que alimentará a Distribuição.

Esta feature permite ao Analista de Identificação criar, listar, editar e excluir captações, garantindo unicidade por rubrica + período e controle de propriedade (cada Analista gerencia apenas suas captações).

---

## 2. Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Analista consegue criar captações sem erros de unicidade | 100% das tentativas de duplicata (rubrica+período não-cancelado) são bloqueadas com mensagem clara |
| Gestão eficiente de captações | Analista consegue localizar qualquer captação em até 3 cliques (listagem com filtros) |
| Integridade de propriedade | 0% de edições/exclusões por Analistas que não são donos da captação |

---

## 3. Usuários e Papéis

| Perfil | Permissões nesta feature |
|---|---|
| Analista de Identificação | Criar, editar (próprias), excluir (próprias ABERTAS), visualizar (todas) |
| Consultor de Identificação | Visualizar (todas). Sem permissão de criação, edição ou exclusão |

---

## 4. Entidades Envolvidas

### Captação

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Rubrica | Seleção (seed) | Sim | Uma das 7 rubricas do sistema |
| Período | Data (`YYYY-MM-DD`) | Sim | Definido manualmente pelo Analista |
| Usuário de Música | Texto livre | Sim | Fonte das execuções (ex: "Rádio Globo SP", "Netflix BR"). Integração futura com Arrecadação |
| Status | Enum | Auto | ABERTA (default ao criar) / FECHADA / CANCELADA |
| Analista responsável | Referência | Auto | Preenchido pelo sistema com o usuário logado |

### Rubrica (seed fixo — 7 registros)

| Sigla | Nome | Classificação por Tipo de Utilização |
|---|---|---|
| RADIO | Rádio AM/FM | Não |
| TV_ABERTA | TV Aberta | Sim (TA, TE, PE, BK) |
| TV_FECHADA | TV Fechada | Sim (TA, TE, PE, BK) |
| CINEMA | Cinema | Sim (TA, TE, PE, BK) |
| VOD | Streaming Vídeo (VOD) | Sim (TA, TE, PE, BK) |
| STREAMING_AUDIO | Streaming Áudio | Não |
| SHOW | Show | Não |

> A rubrica escolhida na captação condiciona se o campo Tipo de Utilização será obrigatório nas execuções (F02/F03). Rubricas audiovisuais (TV Aberta, TV Fechada, Cinema, VOD) exigem classificação; demais não.

---

## 5. Requisitos Funcionais

### RF-01 — Criar Captação

**Descrição:** O Analista de Identificação cria uma nova captação informando rubrica, período e usuário de música.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Analista logado | Preenche rubrica, período (data) e usuário de música e confirma | Captação criada com status ABERTA e analista responsável preenchido automaticamente |
| 2 | Já existe captação não-cancelada para a mesma rubrica + período | Tenta criar outra | Sistema rejeita com mensagem: "Já existe uma captação ativa para [rubrica] em [período]" |
| 3 | Analista não preenche campo obrigatório | Tenta confirmar | Sistema exibe validação indicando campo(s) faltante(s) |

**Regras aplicáveis:** RN-01 (unicidade rubrica+período não-cancelado), RN-07 (período manual)

**Prioridade:** Must Have

---

### RF-02 — Listar Captações

**Descrição:** Todos os usuários (Analista e Consultor) podem visualizar a lista de captações do sistema com filtros.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Usuário logado (Analista ou Consultor) | Acessa a listagem de captações | Visualiza todas as captações com colunas: rubrica, período, usuário de música, status, analista responsável |
| 2 | Usuário aplica filtro por rubrica | Seleciona uma rubrica | Lista exibe apenas captações da rubrica selecionada |
| 3 | Usuário aplica filtro por período | Seleciona intervalo de datas | Lista exibe apenas captações dentro do intervalo |
| 4 | Usuário aplica filtro por status | Seleciona ABERTA, FECHADA ou CANCELADA | Lista exibe apenas captações com o status selecionado |
| 5 | Usuário aplica filtro por responsável | Seleciona um analista | Lista exibe apenas captações daquele analista |

**Prioridade:** Must Have

---

### RF-03 — Visualizar Detalhes de Captação

**Descrição:** Todos os usuários podem acessar os detalhes de uma captação específica.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Usuário logado | Clica em uma captação na listagem | Visualiza todos os dados da captação: rubrica (com indicação se exige classificação), período, usuário de música, status, analista responsável, data de criação |
| 2 | Captação possui execuções (F02/F03) | Acessa detalhes | Exibe contagem de execuções (total, identificadas, pendentes) como resumo — a gestão detalhada de execuções é escopo de F02/F03/F04 |

**Prioridade:** Must Have

---

### RF-04 — Editar Captação ABERTA

**Descrição:** O Analista responsável pode editar os dados de uma captação enquanto ela estiver no estado ABERTA.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Analista é dono da captação E status = ABERTA | Edita rubrica, período ou usuário de música | Dados atualizados com sucesso |
| 2 | Analista é dono da captação E status = ABERTA | Altera rubrica+período para combinação que já existe em outra captação não-cancelada | Sistema rejeita com mensagem de unicidade (RN-01) |
| 5 | Analista é dono, captação ABERTA com execuções vinculadas | Tenta alterar a rubrica | Sistema bloqueia: "Não é possível alterar a rubrica de uma captação que já possui execuções" |
| 3 | Analista NÃO é dono da captação | Tenta editar | Sistema bloqueia a ação — botão de edição não disponível |
| 4 | Captação está FECHADA ou CANCELADA | Analista dono tenta editar | Sistema bloqueia — botão de edição não disponível |

**Regras aplicáveis:** RN-01 (unicidade), RN-08 (propriedade do Analista)

**Prioridade:** Must Have

---

### RF-05 — Excluir Captação ABERTA

**Descrição:** O Analista responsável pode excluir uma captação no estado ABERTA, independentemente de já possuir execuções.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Analista é dono da captação E status = ABERTA | Confirma exclusão | Captação e todas as suas execuções são removidas. Nenhum evento é publicado |
| 2 | Analista é dono E captação tem execuções vinculadas | Solicita exclusão | Sistema exibe confirmação: "Esta captação possui N execuções que também serão removidas. Deseja continuar?" |
| 3 | Analista NÃO é dono | Tenta excluir | Ação não disponível |
| 4 | Captação está FECHADA | Analista tenta excluir | Ação não disponível — para Rols fechados, usar cancelamento (F06) |

**Regras aplicáveis:** RN-08 (propriedade do Analista)

**Prioridade:** Must Have

---

## 6. Não-Objetivos (Fora de Escopo)

- **Cancelamento de captação FECHADA** → F06 (Cancelamento e Recriação)
- **Registro de execuções** dentro da captação → F02 (Manual) e F03 (CSV)
- **Identificação de execuções** → F04
- **Fechamento do Rol** → F05
- **Integração com entidade Usuário de Música do Arrecadação** → futuro, quando D03 for implementado
- **Cálculo de valores, créditos ou distribuição** → domínio Distribuição (D04)
- **Validação de ISRC/ISWC ou consulta ao Cadastro** → F02/F03/F04
- **Workflow de aprovação** — a captação não precisa de aprovação de outro usuário

---

## 7. Restrições Técnicas de Alto Nível

- **Stack:** .NET 8 Minimal API (backend), React/Vite (frontend), PostgreSQL 16 (schema `identificacao`)
- **Autenticação:** JWT via Keycloak — o Analista responsável é derivado do token do usuário logado
- **Schema isolation:** tabelas da Identificação em schema próprio (`identificacao`), sem cross-schema queries
- **Seed de Rubricas:** dados pré-cadastrados via migration, não editáveis pelo usuário. Cada rubrica carrega flag `exige_classificacao` (boolean)

---

## 8. Riscos e Premissas

### Premissas
- O seed de Rubricas (7 registros) será executado via migration do banco, similar ao seed de Associações no Cadastro
- O campo "Usuário de Música" é texto livre nesta fase; quando o domínio Arrecadação for implementado, este campo será migrado para referência à entidade formal
- A propriedade da captação (RN-08) é derivada do JWT — o sistema não permite "transferir" uma captação para outro Analista

### Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Mudança de rubrica em captação ABERTA com execuções pode invalidar tipo de utilização já preenchido (ex: mudar de TV Aberta para Streaming Áudio) | — | — | Resolvido: alteração de rubrica bloqueada quando captação já possui execuções (RF-04 critério 5) |
| Campo "Usuário de Música" texto livre gera inconsistências (mesmo usuário escrito de formas diferentes) | Alta | Baixo | Aceitável para PoC; será resolvido na integração com Arrecadação |

---

## 9. Rastreabilidade

### Vision Doc
- **Fase:** 2 — Identificação + Arrecadação
- **Domínio:** D02 — Identificação
- **Objetivo de negócio:** capacitar o sistema a receber e organizar execuções musicais para alimentar o processo de distribuição

### Domain Doc (`domains/identificacao/domain.md`)
- **Feature:** F01 — Gestão de Captações
- **Regras de negócio:** RN-01 (unicidade rubrica+período), RN-07 (período manual), RN-08 (propriedade do Analista)
- **Entidades:** Captação, Rubrica
- **Dependências downstream:** F02, F03, F04, F05, F06 dependem de F01

---

## 10. Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator` fornecendo `vision.md`, `domains/identificacao/domain.md` e este PRD como contexto.*
