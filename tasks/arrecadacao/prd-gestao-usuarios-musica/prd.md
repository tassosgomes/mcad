# PRD — F02: Gestão de Usuários de Música

> **Domínio:** Arrecadação (D03)
> **Feature ID:** F02
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-04

---

## Visão Geral

Usuários de Música são empresas ou pessoas que utilizam música publicamente e pagam licença ao ECAD — rádios, casas de shows, academias, hotéis, restaurantes, entre outros. No mini-ECAD, o cadastro desses usuários é pré-requisito para a criação de licenças (F03) e o registro de pagamentos (F04) que alimentam o cálculo de verba líquida.

Esta feature implementa o CRUD completo de Usuários de Música com endereço brasileiro (preenchimento automático via ViaCEP no frontend), contato, CNPJ alfanumérico validado como Value Object (referência: Cadastro API) e controle de status com histórico de justificativas.

**Problema:** Sem um cadastro estruturado de usuários de música, não é possível vincular licenças nem registrar pagamentos — o fluxo de arrecadação fica bloqueado.

**Solução:** CRUD completo com validação de CNPJ (Value Object com algoritmo módulo 11), busca de endereço por CEP via ViaCEP (chamada no frontend, com fallback manual se API offline), e controle de status ATIVO/INATIVO bidirecional com histórico de justificativas.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Cadastro funcional de Usuários de Música | Analista consegue criar, editar e inativar usuários sem erros |
| Integridade de dados | Zero CNPJs duplicados no sistema; 100% dos CNPJs passam na validação módulo 11 |
| Busca de endereço por CEP | Frontend preenche endereço automaticamente via ViaCEP quando disponível |
| Histórico de status rastreável | Cada ativação/inativação registrada com justificativa, data e autor |
| Listagem utilizável | Filtros por razão social, CNPJ, status e cidade retornam resultados em menos de 1 segundo |

---

## Histórias de Usuário

### HU-01 — Cadastrar Usuário de Música
**Como** Analista de Arrecadação,
**eu quero** cadastrar um novo Usuário de Música com dados da empresa, endereço e contato,
**para que** ele esteja disponível para vincular a licenças e registrar pagamentos.

### HU-02 — Buscar endereço por CEP
**Como** Analista de Arrecadação,
**eu quero** que ao digitar o CEP o endereço seja preenchido automaticamente,
**para que** o cadastro seja mais ágil e os dados de endereço sejam consistentes.

### HU-03 — Editar Usuário de Música
**Como** Analista de Arrecadação,
**eu quero** editar os dados de um Usuário de Música existente,
**para que** informações desatualizadas sejam corrigidas.

### HU-04 — Inativar Usuário de Música
**Como** Analista de Arrecadação,
**eu quero** inativar um Usuário de Música com justificativa obrigatória,
**para que** ele não receba novas licenças mas seu histórico seja preservado.

### HU-05 — Reativar Usuário de Música
**Como** Analista de Arrecadação,
**eu quero** reativar um Usuário de Música inativo com justificativa obrigatória,
**para que** ele volte a operar no sistema de arrecadação.

### HU-06 — Consultar Usuários de Música
**Como** Consultor de Arrecadação,
**eu quero** listar e buscar Usuários de Música por razão social, CNPJ, status ou cidade,
**para que** eu possa consultar informações sem depender do Analista.

### HU-07 — Visualizar histórico de status
**Como** Analista ou Consultor de Arrecadação,
**eu quero** ver o histórico de ativações e inativações de um Usuário de Música,
**para que** eu saiba quando e por que cada mudança de status ocorreu.

### HU-08 — Selecionar Usuário ao criar licença
**Como** Analista de Arrecadação,
**eu quero** selecionar um Usuário de Música ativo ao criar uma licença,
**para que** a licença seja vinculada corretamente.

> **Nota:** HU-08 será implementada na F03 (Gestão de Licenças). Listada aqui para rastreabilidade — a F02 deve garantir que o endpoint de busca e os dados estejam disponíveis.

---

## Funcionalidades Principais

### 1. CRUD de Usuário de Música

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Criar Usuário de Música com: razão social, nome fantasia, CNPJ, endereço completo (CEP, logradouro, número, complemento, bairro, cidade, UF), contato (telefone, email, nome do responsável). Status inicial = ATIVO | Must Have |
| RF-02 | CNPJ deve ser tratado como Value Object com validação via algoritmo módulo 11 (suportando formato alfanumérico RFB e numérico legado). Referência: `Cadastro.Domain.ValueObjects.Cnpj` | Must Have |
| RF-03 | Validação de unicidade por CNPJ — não permitir dois Usuários com o mesmo CNPJ | Must Have |
| RF-04 | Editar todos os campos do Usuário exceto CNPJ (imutável após criação) | Must Have |
| RF-05 | Sem exclusão física — Usuários são inativados, nunca excluídos | Must Have |
| RF-06 | Nome do responsável é campo obrigatório. Telefone e email são opcionais | Must Have |
| RF-07 | Razão social é campo obrigatório e deve ter no mínimo 3 caracteres | Must Have |

**Critérios de Aceitação — RF-01:**
- **Given** o Analista preenche todos os campos obrigatórios com dados válidos
- **When** submete o formulário de criação
- **Then** o Usuário é criado com status ATIVO e aparece na listagem

**Critérios de Aceitação — RF-02:**
- **Given** o Analista informa um CNPJ numérico válido (ex: 50997063000132)
- **When** submete o formulário
- **Then** o CNPJ é aceito e armazenado

- **Given** o Analista informa um CNPJ alfanumérico válido (novo formato RFB)
- **When** submete o formulário
- **Then** o CNPJ é aceito e armazenado

- **Given** o Analista informa um CNPJ com dígitos verificadores inválidos
- **When** submete o formulário
- **Then** a criação é rejeitada com mensagem "CNPJ inválido"

**Critérios de Aceitação — RF-03:**
- **Given** já existe um Usuário com CNPJ "50997063000132"
- **When** o Analista tenta criar outro Usuário com o mesmo CNPJ
- **Then** a criação é rejeitada com mensagem "CNPJ já cadastrado"

**Critérios de Aceitação — RF-04:**
- **Given** um Usuário existente com CNPJ "50997063000132"
- **When** o Analista tenta editar o CNPJ
- **Then** o campo CNPJ não é editável (read-only no formulário, rejeitado na API)

**Critérios de Aceitação — RF-05:**
- **Given** um Usuário de Música existente
- **When** o Analista tenta excluí-lo
- **Then** não existe opção de exclusão — apenas inativação (RF-09)

### 2. Busca de Endereço por CEP

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-08 | O frontend deve consultar a API ViaCEP (`viacep.com.br/ws/{cep}/json/`) ao preencher o campo CEP e popular automaticamente: logradouro, bairro, cidade e UF | Must Have |
| RF-09 | Se a API ViaCEP estiver indisponível ou o CEP não for encontrado, o usuário deve poder preencher o endereço manualmente | Must Have |
| RF-10 | Campos preenchidos via ViaCEP podem ser editados manualmente pelo Analista após o preenchimento automático | Should Have |

**Critérios de Aceitação — RF-08:**
- **Given** o Analista digita um CEP válido (ex: "01001-000")
- **When** o campo CEP perde o foco ou atinge 8 dígitos
- **Then** logradouro, bairro, cidade e UF são preenchidos automaticamente com dados do ViaCEP

**Critérios de Aceitação — RF-09:**
- **Given** a API ViaCEP está offline ou retorna erro
- **When** o Analista digita o CEP
- **Then** os campos de endereço permanecem editáveis e o Analista preenche manualmente sem bloqueio

### 3. Controle de Status com Histórico

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-11 | Inativar Usuário com justificativa obrigatória (texto, mínimo 10 caracteres). Registra no histórico: data, autor e justificativa | Must Have |
| RF-12 | Reativar Usuário inativo com justificativa obrigatória. Registra no histórico: data, autor e justificativa | Must Have |
| RF-13 | O processo de ativação/inativação pode ser feito N vezes — sem limite | Must Have |
| RF-14 | Histórico de status visível na tela de detalhes do Usuário, ordenado do mais recente ao mais antigo | Must Have |
| RF-15 | Usuário inativo pode ter licenças existentes mas não pode receber novas licenças (validação em F03) | Must Have |

**Critérios de Aceitação — RF-11:**
- **Given** um Usuário com status ATIVO
- **When** o Analista clica em "Inativar" e preenche justificativa com 10+ caracteres
- **Then** o status muda para INATIVO e o registro aparece no histórico com data, autor e justificativa

- **Given** um Usuário com status ATIVO
- **When** o Analista tenta inativar sem justificativa ou com menos de 10 caracteres
- **Then** a operação é rejeitada com mensagem de validação

**Critérios de Aceitação — RF-12:**
- **Given** um Usuário com status INATIVO
- **When** o Analista clica em "Reativar" e preenche justificativa com 10+ caracteres
- **Then** o status muda para ATIVO e o registro aparece no histórico

**Critérios de Aceitação — RF-14:**
- **Given** um Usuário que foi inativado e reativado 3 vezes
- **When** o Analista visualiza o histórico
- **Then** são exibidos 6 registros (3 inativações + 3 reativações) ordenados do mais recente ao mais antigo, cada um com data, autor e justificativa

### 4. Listagem e Busca

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-16 | Listagem paginada de Usuários de Música com colunas: razão social, nome fantasia, CNPJ (formatado), cidade/UF, status | Must Have |
| RF-17 | Filtros: razão social (busca parcial), CNPJ (busca parcial), status (ATIVO/INATIVO/todos), cidade (busca parcial) | Must Have |
| RF-18 | Ordenação padrão por razão social (A-Z). Colunas ordenáveis: razão social, cidade, status | Should Have |
| RF-19 | Endpoint de busca por ID retornando dados completos do Usuário para consumo por F03 (Licenças) | Must Have |

**Critérios de Aceitação — RF-16:**
- **Given** existem 50 Usuários cadastrados
- **When** o Analista ou Consultor acessa a listagem
- **Then** são exibidos 20 registros por página (paginação server-side) com dados tabulares

**Critérios de Aceitação — RF-17:**
- **Given** existem Usuários com razão social contendo "Rádio"
- **When** o usuário filtra por razão social "rádio" (case-insensitive)
- **Then** são exibidos apenas os Usuários cuja razão social contém "rádio"

---

## Experiência do Usuário

### Fluxo Principal — Cadastro
1. Analista acessa "Arrecadação" → "Usuários de Música" → "Novo"
2. Preenche razão social, nome fantasia e CNPJ
3. Digita o CEP → sistema busca endereço via ViaCEP e preenche campos automaticamente
4. Preenche número, complemento (se aplicável) e dados de contato (nome do responsável obrigatório)
5. Submete o formulário → Usuário criado como ATIVO

### Fluxo — Inativação/Reativação
1. Analista acessa detalhes do Usuário
2. Clica em "Inativar" (ou "Reativar" se inativo)
3. Modal solicita justificativa (mínimo 10 caracteres)
4. Confirma → status atualizado, registro adicionado ao histórico

### Considerações de UI
- CNPJ formatado na exibição (AA.BBB.CCC/DDDD-EE), armazenado sem formatação
- Badge visual de status: ATIVO (verde), INATIVO (cinza)
- Campo CEP com ícone de loading durante consulta ViaCEP
- Histórico de status em timeline ou tabela na aba de detalhes
- Consultor não vê botões de ação (Novo, Editar, Inativar/Reativar)

---

## Restrições Técnicas de Alto Nível

- Stack Java Spring Boot (fundação criada em F01)
- Schema `arrecadacao` no PostgreSQL (Schema-per-Service)
- CNPJ como Value Object com validação módulo 11 — referência de implementação em `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/Cnpj.cs` (adaptar para Java)
- Busca ViaCEP exclusivamente no frontend (não no backend) — API pública, sem autenticação
- Autenticação JWT Bearer via Keycloak — roles `analista-arrecadacao` (leitura + escrita) e `consultor-arrecadacao` (somente leitura)

---

## Não-Objetivos (Fora de Escopo)

- Validação de CNPJ junto à Receita Federal (apenas validação algorítmica local)
- Distinção entre Usuário Permanente (mensalista) e Eventual (eventos) — RN-11
- Exclusão física de registros
- Gestão de licenças vinculadas (F03)
- Registro de pagamentos (F04)
- Integração ViaCEP no backend — chamada exclusiva do frontend
- Busca de CEP por endereço (busca reversa)

---

## Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Cadastrar base de usuários de música para alimentar o fluxo de arrecadação
- **Perfis:** Analista de Arrecadação, Consultor de Arrecadação
- **Glossário:** Usuário de Música — "Empresa ou pessoa que utiliza música publicamente e paga licença ao ECAD"
- **Restrição global:** PoC auto-contida; CNPJ alfanumérico (novo formato RFB)

### Domain Doc (Arrecadação — D03)
- **Feature:** F02 — Gestão de Usuários de Música
- **Entidades:** Usuário de Música, Histórico de Status (nova, derivada do requisito de justificativa)
- **Regras referenciadas:** RN-07 (CNPJ alfanumérico, unicidade), RN-11 (sem distinção permanente/eventual)
- **Dependências:** F01 (Rubricas) como pré-requisito de fundação; downstream: F03 (Licenças) consome endpoint de busca
- **Ordem de implementação:** Segunda feature do domínio

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar o contrato de API, use a skill `flow-contract-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator`.*
