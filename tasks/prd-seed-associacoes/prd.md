# PRD — F01: Seed de Associações

> **Domínio:** Cadastro (D01)
> **Feature ID:** F01
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-03-29

---

## Visão Geral

As associações de gestão coletiva são entidades fundamentais do ecossistema ECAD — representam os titulares de direitos autorais e conexos perante o sistema de arrecadação e distribuição. No mini-ECAD, as 7 associações reais devem estar disponíveis como dados pré-cadastrados desde o primeiro uso do sistema, servindo como referência obrigatória para o cadastro de titulares.

Esta feature é o alicerce do domínio Cadastro: sem associações disponíveis, não é possível cadastrar titulares (F02), que por sua vez são pré-requisito para obras (F03), titularidades (F04) e fonogramas (F05).

**Problema:** O sistema precisa de uma base de dados de associações disponível desde o startup, sem depender de cadastro manual, para que o fluxo de cadastro de titulares funcione imediatamente.

**Solução:** Carga automática (seed) das 7 associações com seus dados essenciais (nome, sigla, CNPJ), não editáveis por nenhum perfil, com tela de consulta read-only.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Associações disponíveis desde o primeiro uso | 7 registros presentes no sistema após primeiro startup, sem intervenção manual |
| Dados íntegros e não adulteráveis | Nenhuma operação de criação, edição ou exclusão disponível para qualquer perfil |
| Consulta acessível para ambos os perfis | Tela de listagem carrega em menos de 1 segundo com todos os registros |
| Referência funcional para Titulares | Dropdown de associações disponível e funcional no cadastro de titulares (validado na F02) |

---

## Histórias de Usuário

### HU-01 — Consultar associações
**Como** Analista de Cadastro ou Consultor,
**eu quero** visualizar a lista completa de associações de gestão coletiva com nome, sigla e CNPJ,
**para que** eu possa consultar os dados de referência ao trabalhar com cadastros de titulares.

### HU-02 — Associações disponíveis no startup
**Como** sistema (automático),
**eu preciso** que as 7 associações estejam cadastradas automaticamente na primeira inicialização,
**para que** o fluxo de cadastro de titulares funcione sem necessidade de carga manual prévia.

### HU-03 — Selecionar associação ao cadastrar titular
**Como** Analista de Cadastro,
**eu quero** selecionar uma associação a partir de uma lista ao cadastrar um titular,
**para que** o vínculo titular-associação seja registrado corretamente.

> **Nota:** HU-03 será implementada na F02 (Gestão de Titulares). Listada aqui para rastreabilidade — a F01 deve garantir que os dados estejam disponíveis para consumo.

---

## Funcionalidades Principais

### 1. Seed Automático de Associações

O sistema deve popular automaticamente as 7 associações na primeira inicialização. Se os dados já existirem, o seed não deve duplicar registros.

**Dados das associações:**

| # | Sigla | Nome Completo | CNPJ |
|---|-------|--------------|------|
| 1 | ABRAMUS | Associação Brasileira de Música e Artes | 50.997.063/0001-32 |
| 2 | AMAR | Associação de Músicos, Arranjadores e Regentes | 30.713.325/0001-82 |
| 3 | ASSIM | Associação de Intérpretes e Músicos | 43.985.563/0001-99 |
| 4 | SBACEM | Sociedade Brasileira de Autores, Compositores e Escritores de Música | 33.780.222/0001-23 |
| 5 | SICAM | Sociedade Independente de Compositores e Autores Musicais | 62.092.010/0001-51 |
| 6 | SOCINPRO | Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais | 33.748.146/0001-79 |
| 7 | UBC | União Brasileira de Compositores | 33.576.166/0001-00 |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | O sistema deve conter as 7 associações pré-cadastradas automaticamente na primeira inicialização | Must Have |
| RF-02 | Cada associação deve conter os atributos: nome completo, sigla e CNPJ | Must Have |
| RF-03 | O seed deve ser idempotente — executar múltiplas vezes não deve duplicar registros | Must Have |
| RF-04 | Associações não podem ser criadas, editadas ou excluídas por nenhum perfil de usuário via interface ou API | Must Have |

**Critérios de Aceitação — RF-01:**
- **Given** o sistema é iniciado pela primeira vez
- **When** o processo de startup é concluído
- **Then** existem exatamente 7 associações cadastradas no sistema

**Critérios de Aceitação — RF-03:**
- **Given** as 7 associações já existem no sistema
- **When** o processo de startup é executado novamente
- **Then** continuam existindo exatamente 7 associações, sem duplicatas

**Critérios de Aceitação — RF-04:**
- **Given** qualquer perfil de usuário (Analista de Cadastro ou Consultor)
- **When** tenta criar, editar ou excluir uma associação
- **Then** a operação é negada (sem endpoint de escrita exposto)

### 2. Tela de Listagem de Associações (Read-Only)

Interface para consulta das associações cadastradas, acessível por ambos os perfis.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-05 | Tela de listagem exibindo todas as associações em formato tabular com colunas: sigla, nome completo e CNPJ | Must Have |
| RF-06 | A listagem deve ser acessível pelos perfis Analista de Cadastro e Consultor | Must Have |
| RF-07 | A tela não deve conter botões ou ações de criação, edição ou exclusão | Must Have |

**Critérios de Aceitação — RF-05:**
- **Given** o usuário acessa a tela de associações
- **When** a tela é carregada
- **Then** são exibidas 7 linhas com sigla, nome completo e CNPJ de cada associação

**Critérios de Aceitação — RF-07:**
- **Given** o usuário está na tela de associações
- **When** visualiza as opções disponíveis
- **Then** não existem botões de "Novo", "Editar" ou "Excluir"

### 3. API de Consulta de Associações

Endpoint para consumo pela tela de listagem e pelo futuro cadastro de titulares (F02).

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-08 | API de listagem de associações retornando todos os registros com id, sigla, nome e CNPJ | Must Have |
| RF-09 | API de consulta individual por ID retornando os dados de uma associação específica | Should Have |
| RF-10 | Apenas endpoints de leitura (GET) devem ser expostos — sem POST, PUT, PATCH ou DELETE | Must Have |

**Critérios de Aceitação — RF-08:**
- **Given** um consumidor (frontend ou outro serviço) faz GET na listagem de associações
- **When** a requisição é processada
- **Then** retorna array com 7 objetos contendo id, sigla, nome e CNPJ

**Critérios de Aceitação — RF-10:**
- **Given** um consumidor tenta fazer POST, PUT, PATCH ou DELETE no recurso de associações
- **When** a requisição é recebida
- **Then** retorna HTTP 405 Method Not Allowed

---

## Experiência do Usuário

### Fluxo Principal
1. Usuário acessa o menu "Cadastro" → "Associações"
2. Sistema exibe tabela com as 7 associações (sigla, nome, CNPJ)
3. Usuário consulta os dados — sem ações de edição disponíveis

### Considerações de UI
- Tabela simples, sem paginação (apenas 7 registros)
- Sem filtros ou busca (volume fixo e pequeno)
- Indicação visual de que os dados são read-only (ex: ausência de ícones de ação)

---

## Restrições Técnicas de Alto Nível

- Dados devem residir no schema `cadastro` do PostgreSQL (Schema-per-Service)
- Seed deve ser executado como parte do processo de inicialização do serviço de Cadastro
- Valores percentuais e monetários não se aplicam a esta feature, mas o padrão de precisão decimal (RN-08) deve ser adotado como convenção do domínio desde o início
- CNPJs reais das associações conforme dados oficiais

---

## Não-Objetivos (Fora de Escopo)

- CRUD de associações — são dados fixos e imutáveis
- Dados adicionais como endereço, telefone, site ou dados de contato
- Lógica de ativação/desativação de associações
- Integração com sistemas externos das associações
- Histórico de alterações (não há alterações)

---

## Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Estabelecer master data de referência para o domínio Cadastro
- **Perfis:** Analista de Cadastro, Consultor (conforme Vision Doc seção 1)
- **Restrição global:** PoC auto-contida, sem integração com associações externas (Non-Goal do Vision Doc)

### Domain Doc (Cadastro — D01)
- **Feature:** F01 — Seed de Associações
- **Entidade:** Associação (nome, sigla + CNPJ adicionado nesta sessão)
- **Regras referenciadas:** Nenhuma RN específica — feature de dados de referência
- **Dependências:** Nenhuma upstream; downstream: F02 (Gestão de Titulares) consome associações como referência
- **Ordem de implementação:** Primeira feature do domínio (pré-requisito)

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar a Especificação Técnica, use a skill `techspec-creator` fornecendo este PRD, o `vision.md` e o `domain.md` como contexto.*
