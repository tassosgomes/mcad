# PRD — Copiloto Operacional com IA e Mastra

> **Domínio:** Plataforma / Cross-cutting  
> **Feature ID:** P-AI-01  
> **Prioridade:** Should Have  
> **Status:** `planned`  
> **Data:** 2026-05-12

---

## Visão Geral

O Copiloto Operacional com IA é um chatbot interno do MCAD que permite ao usuário consultar dados e executar fluxos assistidos usando linguagem natural. A proposta parte da abordagem de **chatbot operacional com tools**: o assistente não responde apenas com texto, mas pode chamar ferramentas seguras para consultar APIs internas de Cadastro, Identificação, Arrecadação, Distribuição, Auditoria e Autorização.

A implementação deve usar **Mastra** como camada de orquestração de agentes, tools e workflows, mantendo o BFF como fronteira do frontend. A Mastra será usada para definir tools tipadas, workflows previsíveis e rastreáveis, RuntimeContext com identidade/permissões do usuário, memória de conversa e observabilidade dos passos executados.

O MVP deve ser deliberadamente conservador: ferramentas somente leitura, respostas explicáveis, auditoria de chamadas e nenhuma alteração de dados sem aprovação humana explícita em workflow.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Reduzir atrito para consultar informações cross-domain | 80% das perguntas suportadas resolvidas sem navegação manual entre telas |
| Demonstrar uso seguro de IA com tools no MCAD | 100% das chamadas a tools com usuário, permissões, parâmetros e resultado auditados |
| Preservar autorização e isolamento entre domínios | Zero acesso direto do frontend às APIs internas fora do BFF/AI service |
| Tornar fluxos operacionais repetíveis | Pelo menos 3 workflows documentados e executáveis com etapas tipadas |
| Controlar risco de ações automatizadas | MVP sem escrita automática; ações sensíveis ficam suspensas aguardando confirmação humana |

---

## Histórias de Usuário

### HU-01 — Consultar uma obra por linguagem natural
**Como** Analista de Cadastro,  
**eu quero** perguntar "qual o status da obra X e seus titulares?",  
**para que** eu obtenha uma visão consolidada sem abrir múltiplas telas.

### HU-02 — Investigar um pagamento
**Como** Analista de Arrecadação,  
**eu quero** perguntar "explique o pagamento Y e a verba líquida calculada",  
**para que** eu entenda dados, rubrica, período, status e eventos relacionados.

### HU-03 — Validar pré-requisitos de distribuição
**Como** Tech Lead ou Analista de Distribuição,  
**eu quero** pedir "verifique se o processo de distribuição pode rodar para esta rubrica/período",  
**para que** o sistema execute um checklist com consultas nos domínios necessários.

### HU-04 — Executar fluxo com aprovação
**Como** usuário autorizado,  
**eu quero** que o copiloto prepare uma ação sensível e peça confirmação antes de executar,  
**para que** eu mantenha controle humano sobre alterações de estado.

---

## Funcionalidades Principais

### RF-01 — Chat operacional integrado ao frontend
O frontend deve oferecer uma interface de conversa acessível a partir da aplicação MCAD. A conversa deve mostrar a resposta, as fontes operacionais consultadas e um resumo das tools utilizadas quando aplicável.

**Critérios de Aceitação**
- **Given** usuário autenticado no MCAD  
- **When** abre o copiloto e envia uma pergunta  
- **Then** a mensagem é enviada pelo BFF para o serviço de IA e retorna uma resposta contextualizada

### RF-02 — Tools somente leitura no MVP
O MVP deve disponibilizar tools para consultar dados existentes, começando por:

| Tool | Descrição | MoSCoW |
|---|---|---|
| `buscarObra` | Consulta obra por ID, título, ISWC ou código interno | Must Have |
| `buscarFonograma` | Consulta fonograma por ID, ISRC ou título | Must Have |
| `buscarTitular` | Consulta titular por nome, documento ou ID | Must Have |
| `consultarPagamento` | Consulta pagamento/licença/rubrica/período | Should Have |
| `consultarProcessoDistribuicao` | Consulta processo e créditos calculados | Should Have |
| `consultarAuditoria` | Consulta histórico auditável de uma entidade | Should Have |
| `consultarPermissoesUsuario` | Consulta permissões efetivas no `ecad-authz` | Must Have |

**Critérios de Aceitação**
- **Given** uma pergunta que exige dado operacional  
- **When** o agente identifica a necessidade de uma tool  
- **Then** a tool é chamada com schema validado e respeitando permissões do usuário

### RF-03 — RuntimeContext com identidade e autorização
Toda execução deve receber contexto do usuário: ID, roles/permissões, tenant/ambiente quando existir, idioma e request ID. As tools devem negar chamadas sem permissão suficiente.

**Critérios de Aceitação**
- **Given** usuário sem permissão para um domínio  
- **When** solicita dados desse domínio pelo copiloto  
- **Then** a tool retorna negação controlada e a resposta não vaza dados

### RF-04 — Workflows operacionais tipados
A Mastra deve ser usada para workflows previsíveis, com passos tipados e rastreáveis. Workflows iniciais:

| Workflow | Descrição | MoSCoW |
|---|---|---|
| `explicarObraWorkflow` | Consolida obra, titulares, fonogramas, status e auditoria | Must Have |
| `validarDistribuicaoWorkflow` | Verifica rubrica/período, rol fechado, verba disponível e pré-requisitos | Should Have |
| `prepararAcaoSensivelWorkflow` | Prepara proposta de alteração e suspende para confirmação humana | Should Have |

**Critérios de Aceitação**
- **Given** workflow com múltiplas consultas  
- **When** uma etapa falha  
- **Then** o resultado explicita a etapa falha e preserva os demais achados seguros

### RF-05 — Confirmação humana para ações sensíveis
Qualquer operação futura de escrita deve usar workflow com suspensão e retomada. O MVP não executa escrita, mas deve documentar e preparar a arquitetura.

**Critérios de Aceitação**
- **Given** uma intenção de alterar estado  
- **When** o agente monta a proposta  
- **Then** o workflow fica suspenso aguardando aprovação explícita do usuário autorizado

### RF-06 — Auditoria e observabilidade
O sistema deve registrar conversa, tools chamadas, parâmetros sanitizados, permissões avaliadas, latência, custo/tokens quando disponível e resultado do workflow.

**Critérios de Aceitação**
- **Given** uma execução concluída  
- **When** o operador consulta logs/traces  
- **Then** consegue reconstruir pergunta, tools usadas, decisão de autorização e resposta final

---

## Experiência do Usuário

O copiloto deve aparecer como painel lateral ou rota dedicada, sem substituir as telas operacionais existentes. A interface deve priorizar fluxo de trabalho: campo de pergunta, histórico da conversa, estado de carregamento, indicação discreta de tools executadas e botões de confirmação apenas quando um workflow suspenso exigir ação humana.

O assistente deve responder em português, usar termos do glossário do MCAD e evitar linguagem probabilística quando o dado vem de API. Quando não houver dado suficiente, deve explicar a lacuna e sugerir a próxima consulta operacional.

---

## Restrições Técnicas de Alto Nível

- Manter o BFF como fronteira do frontend.
- Não expor chave OpenAI no frontend.
- Usar Mastra para agents, tools, workflows, RuntimeContext, storage e observabilidade.
- Usar OpenAI como provedor de modelo no MVP.
- Respeitar autenticação atual e autorização fina via `ecad-authz`.
- Não violar Schema-per-Service; tools consultam APIs, não fazem joins diretos no banco.
- Sanitizar dados pessoais/sensíveis em logs, traces e memória.
- MVP somente leitura para dados de negócio.

---

## Não-Objetivos (Fora de Escopo)

- Não substituir as telas operacionais existentes.
- Não executar alteração de dados sem confirmação humana.
- Não criar integração por voz no MVP.
- Não implementar RAG documental completo nesta primeira etapa.
- Não fazer treinamento/fine-tuning de modelo.
- Não permitir acesso cross-domain direto ao banco de dados.
- Não expor o copiloto fora do ambiente autenticado do MCAD.

---

## Rastreabilidade

### Vision Doc
- Cross-cutting Plataforma: BFF/API Composition e Frontend React/Vite.
- Restrições globais: PostgreSQL 16, RabbitMQ, Docker Compose, autenticação centralizada, isolamento por contexto.
- Non-goals preservados: não substituir produção, não cobrir 100% das regras reais, não gerar pagamentos reais.

### Documentação Mastra consultada
- Tools tipadas para agentes: https://mastra.ai/docs/agents/using-tools
- Workflows e controle de fluxo: https://mastra.ai/docs/workflows/control-flow
- Agents e tools em workflows: https://mastra.ai/docs/workflows/agents-and-tools
- RuntimeContext: https://mastra.ai/docs/server-db/runtime-context
- Suspend/Resume: https://mastra.ai/docs/workflows/suspend-and-resume
- Storage: https://mastra.ai/docs/server-db/storage
- Observability: https://mastra.ai/docs/observability/overview

---

## Questões em Aberto

1. O copiloto deve ficar dentro do BFF atual ou em um novo serviço `ai-orchestrator` com Mastra? A TechSpec recomenda novo serviço para reduzir acoplamento.
2. Qual modelo OpenAI será padrão no momento da implementação?
3. Quais permissões exatas do `ecad-authz` governam cada tool?
4. Por quanto tempo reter conversas, traces e dados de auditoria?
5. O MVP deve incluir apenas Cadastro ou já cobrir Arrecadação e Distribuição?

---

*PRD gerado com as skills `prd-creator` e `openai-docs`, enriquecido com documentação oficial da Mastra.*
