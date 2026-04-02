# PRD — F02: Registro Manual de Execuções

> **Domínio:** Identificação (D02)
> **Feature:** F02 — Registro Manual de Execuções
> **Prioridade:** Must Have
> **Status:** `planned`
> **Última revisão:** 2026-04-02

---

## 1. Visão Geral

Execuções musicais são o dado fundamental do domínio de Identificação — sem elas, não há Rol de Execuções e a Distribuição não tem base para calcular créditos. O formulário manual é a forma mais direta de o Analista registrar execuções em uma captação, com busca integrada ao Cadastro para identificação automática de obras e fonogramas.

Esta feature adiciona à tela de detalhe da captação (F01) uma seção de execuções com tabela, formulário de adição, edição e exclusão, além de integração HTTP com o Cadastro para busca e criação inline de obras/fonogramas pendentes.

---

## 2. Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Analista consegue registrar execuções com identificação automática | 100% das execuções com ISRC/ISWC válido são identificadas automaticamente ao salvar |
| Fluxo de busca integrado ao Cadastro | Busca por ISRC, ISWC, título ou titular retorna resultados em até 3 segundos |
| Execuções não encontradas não bloqueiam o trabalho | Analista consegue criar obra/fonograma pendente inline e continuar registrando |
| Campos condicionais respeitam a rubrica | 0% de execuções em rubricas audiovisuais salvas sem tipo de utilização |

---

## 3. Usuários e Papéis

| Perfil | Permissões nesta feature |
|---|---|
| Analista de Identificação | Adicionar, editar (próprias), excluir (próprias) execuções em captações ABERTAS que são suas |
| Consultor de Identificação | Visualizar execuções. Sem permissão de criação, edição ou exclusão |

---

## 4. Entidades Envolvidas

### Execução

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Obra/Fonograma | Referência (busca) | Sim | Resolve para obra_id e/ou fonograma_id via Cadastro |
| Início | Hora (`HH:mm:ss`) | Sim | Horário dentro do dia da captação |
| Fim | Hora (`HH:mm:ss`) | Sim | Deve ser posterior ao início |
| Duração | Inteiro (segundos) | Auto | Calculado: fim - início |
| Quantidade de ocorrências | Inteiro (≥ 1) | Sim | Default: 1. Permite múltiplas ocorrências (RN-03) |
| Tipo de utilização | Enum (TA/TE/PE/BK) | Condicional | Obrigatório se rubrica da captação exige classificação (RN-12) |
| Título do programa | Texto (max 255) | Condicional | Obrigatório se rubrica audiovisual |
| Intérpretes | Texto (auto) | Auto | Até 3 principais separados por `/`, preenchido do Cadastro |
| Status | Enum | Auto | IDENTIFICADA (match no Cadastro) ou PENDENTE (sem match / obra pendente) |

### Tipo de Utilização (seed fixo — reutilizado do Domain Doc)

| Sigla | Descrição | Peso |
|---|---|---|
| TA | Tema de Abertura | 1/1 (100%) |
| TE | Tema de Encerramento | 1/1 (100%) |
| PE | Performance Cênica | 1/1 (100%) |
| BK | Background (Música de Fundo) | 1/12 (≈8,33%) |

---

## 5. Requisitos Funcionais

### RF-01 — Buscar obra/fonograma no Cadastro

**Descrição:** O Analista busca obras e fonogramas no Cadastro por ISRC, ISWC, título ou nome de titular. A busca é integrada como componente de autocomplete/search no formulário.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Analista no formulário de execução | Digita um ISRC válido (ex: `BRUM71500001`) | Sistema consulta Cadastro e retorna fonograma(s) correspondente(s) com título e intérpretes |
| 2 | Analista no formulário | Digita um ISWC válido | Sistema retorna obra(s) correspondente(s) |
| 3 | Analista no formulário | Digita parte de um título (min 3 chars) | Sistema retorna obras/fonogramas cujo título contém o texto |
| 4 | Analista no formulário | Digita nome de um titular | Sistema retorna obras/fonogramas vinculados a esse titular |
| 5 | Busca sem resultados | Analista busca e não encontra | Sistema exibe opção "Criar obra/fonograma pendente" |

**Regras aplicáveis:** RN-09 (identificação automática via ISRC/ISWC)

**Prioridade:** Must Have

---

### RF-02 — Adicionar execução a captação ABERTA

**Descrição:** O Analista adiciona uma execução preenchendo os campos obrigatórios. Ao salvar, o sistema calcula a duração e define o status automaticamente.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação ABERTA, analista é dono | Seleciona obra/fonograma da busca, preenche início, fim, quantidade e salva | Execução criada com status IDENTIFICADA, duração calculada, intérpretes preenchidos do Cadastro |
| 2 | Rubrica audiovisual (TV Aberta, TV Fechada, Cinema, VOD) | Analista tenta salvar sem tipo de utilização | Sistema rejeita: "Tipo de utilização é obrigatório para esta rubrica" |
| 3 | Rubrica audiovisual | Analista tenta salvar sem título do programa | Sistema rejeita: "Título do programa é obrigatório para esta rubrica" |
| 4 | Rubrica não-audiovisual (Rádio, Streaming Áudio, Show) | Analista salva sem tipo de utilização | Execução salva com sucesso — campo não é obrigatório |
| 5 | Fim anterior ao início | Analista preenche início 14:30 e fim 14:20 | Sistema rejeita: "O horário de fim deve ser posterior ao início" |
| 6 | Captação FECHADA ou CANCELADA | Analista tenta adicionar | Ação não disponível (RN-04) |
| 7 | Analista NÃO é dono | Tenta adicionar | Ação não disponível (RN-08) |

**Regras aplicáveis:** RN-02, RN-03, RN-04, RN-08, RN-12

**Prioridade:** Must Have

---

### RF-03 — Criar obra/fonograma pendente inline

**Descrição:** Quando a busca não retorna resultados, o Analista pode criar uma obra ou fonograma com status PENDENTE diretamente no Cadastro, sem sair do formulário de execução.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Não encontrou obra | Analista clica "Criar obra pendente" | Modal/inline form com campos mínimos: título, tipo de obra. Chama Cadastro API (POST /obras). Obra criada com status PENDENTE |
| 2 | Obra pendente criada | Analista confirma | Campo de busca preenchido com a nova obra. Execução terá status PENDENTE |
| 3 | Encontrou obra mas não encontrou fonograma | Analista clica "Criar fonograma pendente" | Modal/inline form com campos: ISRC (opcional). Obra já selecionada (vinculação automática). Chama Cadastro API (POST /fonogramas) |
| 4 | Não encontrou obra nem fonograma | Analista cria obra pendente (cenário 1), depois cria fonograma pendente vinculado a ela (cenário 3) | Ambos criados no Cadastro com status PENDENTE. Execução terá status PENDENTE |
| 5 | Fonograma pendente criado | Analista confirma | Fonograma sempre vinculado a uma obra (nunca "solto"). Execução terá status PENDENTE |

**Regras aplicáveis:** RN-02 (execução com obra/fonograma pendente fica PENDENTE). Fonograma não existe sem obra — vínculo obrigatório.

**Nota:** A criação inline é restrita a registros com status PENDENTE. Edição completa dos dados cadastrais deve ser feita no módulo de Cadastro.

**Prioridade:** Must Have

---

### RF-04 — Listar execuções da captação

**Descrição:** A tela de detalhe da captação (F01) exibe uma seção "Execuções" com tabela paginada de todas as execuções da captação.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação com execuções | Analista ou Consultor acessa detalhe da captação | Seção "Execuções" exibe tabela com colunas: título, ISRC/ISWC, intérpretes, início, fim, duração, quantidade, tipo de utilização, status |
| 2 | Captação sem execuções | Acessa detalhe | Seção exibe empty state: "Nenhuma execução registrada" |
| 3 | Muitas execuções | Tabela com > 20 itens | Paginação (page/size, default 20) |
| 4 | Tabela de execuções | Analista dono + captação ABERTA | Botão "Adicionar Execução" visível. Ícones de edição e exclusão visíveis por linha |
| 5 | Consultor ou outro Analista | Acessa detalhe | Tabela visível mas sem botões de ação |

**Prioridade:** Must Have

---

### RF-05 — Editar execução existente

**Descrição:** O Analista dono pode editar qualquer campo de uma execução em captação ABERTA.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Analista dono, captação ABERTA | Clica em editar uma execução | Formulário preenchido com dados atuais, permite alteração de todos os campos |
| 2 | Analista altera obra/fonograma via busca | Salva | Novo vínculo aplicado, status recalculado (IDENTIFICADA se match, PENDENTE se não) |
| 3 | Analista NÃO é dono | Tenta editar | Ação não disponível |
| 4 | Captação FECHADA | Tenta editar | Ação não disponível (RN-04) |

**Regras aplicáveis:** RN-04, RN-08

**Prioridade:** Must Have

---

### RF-06 — Excluir execução existente

**Descrição:** O Analista dono pode excluir execuções individuais de captação ABERTA.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Analista dono, captação ABERTA | Clica excluir, confirma | Execução removida, contadores de resumo atualizados |
| 2 | Exclusão solicitada | Sistema exibe confirmação | Dialog: "Excluir execução de [título]?" com botões Cancelar/Excluir |
| 3 | Analista NÃO é dono | Tenta excluir | Ação não disponível |
| 4 | Captação FECHADA | Tenta excluir | Ação não disponível (RN-04) |

**Regras aplicáveis:** RN-04, RN-08

**Prioridade:** Must Have

---

### RF-07 — Campos condicionais por rubrica

**Descrição:** O formulário adapta campos obrigatórios com base na rubrica da captação.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação com rubrica audiovisual (TV Aberta, TV Fechada, Cinema, VOD) | Formulário de execução aberto | Campos "Tipo de utilização" e "Título do programa" visíveis e obrigatórios |
| 2 | Captação com rubrica não-audiovisual (Rádio, Streaming Áudio, Show) | Formulário aberto | Campos "Tipo de utilização" e "Título do programa" ocultos ou opcionais |

**Regras aplicáveis:** RN-12

**Prioridade:** Must Have

---

### RF-08 — Cálculo automático de duração

**Descrição:** A duração é calculada automaticamente como diferença entre fim e início, exibida em formato legível.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Analista preenche início `14:30:00` e fim `14:33:45` | Campo de duração atualiza | Exibe "3min 45s" (225 segundos armazenados) |
| 2 | Analista altera início ou fim | Campo recalcula | Duração atualizada automaticamente |

**Prioridade:** Must Have

---

## 6. Não-Objetivos (Fora de Escopo)

- **Upload via CSV** → F03
- **Tela de gestão de execuções pendentes** (identificação manual em lote) → F04
- **Fechamento do Rol** → F05
- **Busca fuzzy/fonética** de títulos → PoC usa busca exata (ILike/contains)
- **Validação de duplicidade de execuções** (mesmo ISRC + mesmo horário) → não necessário na PoC
- **Ordenação de execuções** por peso/tipo de utilização → não necessário nesta feature
- **Edição de obra/fonograma** criada inline → o Analista cria no Cadastro, edição completa é no módulo de Cadastro

---

## 7. Restrições Técnicas de Alto Nível

- **Integração HTTP com Cadastro:** busca (GET) e criação de obra/fonograma pendente (POST) via API do Cadastro (`:5001`)
- **Endpoint de busca unificada no Cadastro:** não existe — precisa ser criado. Deve suportar filtro por ISRC, ISWC, título e titular em uma única chamada
- **Schema isolation:** execuções no schema `identificacao`, obras/fonogramas no schema `cadastro` — sem cross-schema queries
- **Auth:** mesmas roles de F01 — `analista-identificacao` (write), `consultor-identificacao` (read). Criação de obras/fonogramas pendentes no Cadastro permitida apenas para registros com status PENDENTE
- **Seed de Tipos de Utilização:** 4 registros (TA, TE, PE, BK) — mesma estratégia de seed de Rubricas

---

## 8. Riscos e Premissas

### Premissas
- O Cadastro API já está rodando e expõe endpoints de busca e criação de obras/fonogramas
- A busca no Cadastro suporta filtro por ISRC, ISWC, título e titular (endpoints existentes ou a criar)
- O Analista de Identificação tem permissão (via Keycloak) para criar obras/fonogramas pendentes no Cadastro
- Os contadores de resumo da captação (total, identificadas, pendentes) implementados em F01 serão alimentados automaticamente

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Cadastro API indisponível durante registro de execuções | Média | Alto | Permitir salvar execução como PENDENTE mesmo sem resposta do Cadastro; retry posterior |
| Endpoint de busca unificada do Cadastro precisa ser criado — não existe | Alta | Médio | Incluir criação do endpoint como dependência desta feature (tarefa no serviço de Cadastro) |
| Permissão de criação no Cadastro restrita a pendentes — política de autorização a definir | Média | Médio | Criar policy ou scope específico (`create-pendente`) no Cadastro que analistas de Identificação possam usar |

---

## 9. Rastreabilidade

### Vision Doc
- **Fase:** 2 — Identificação + Arrecadação
- **Domínio:** D02 — Identificação
- **Dependência:** Cadastro (consulta HTTP) conforme mapa de interdependências

### Domain Doc (`domains/identificacao/domain.md`)
- **Feature:** F02 — Registro Manual de Execuções
- **Regras de negócio:** RN-02, RN-03, RN-04, RN-08, RN-09, RN-12
- **Entidades:** Execução, Tipo de Utilização (seed)
- **Dependência upstream:** Cadastro — busca + criação de obras/fonogramas

---

## 10. Questões em Aberto

- [x] ~~Endpoint de busca unificada no Cadastro~~ → Resolvido: não existe, precisa ser criado como dependência
- [x] ~~Permissão cruzada~~ → Resolvido: criação restrita a registros PENDENTES, policy/scope específico a definir
- [x] ~~Fonograma sem obra~~ → Resolvido: fonograma sempre vinculado a uma obra (obrigatório)

Todas as questões foram resolvidas. PRD pronto para API Contract e TechSpec.

---

*PRD gerado com a skill `criador-prd-v2`. Para gerar o API Contract, use a skill `flow-contract-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator`.*
