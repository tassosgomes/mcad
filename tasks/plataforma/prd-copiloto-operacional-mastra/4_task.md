---
status: completed
parallelizable: false
blocked_by: [1.0, 3.0]
---

<task_context>
<domain>plataforma/ai-orchestrator/agent</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>external_apis,http_server</dependencies>
<unblocks>5.0, 6.0, 7.0, 8.0</unblocks>
</task_context>

# Tarefa 4.0: Implementar agente Mastra principal com provedor OpenAI

## Relacionada as User Stories

- HU-01 Consultar obra por linguagem natural (cobertura parcial)
- HU-02 Investigar pagamento (cobertura parcial)
- HU-03 Validar pre-requisitos de distribuicao (suporte)
- HU-04 Executar fluxo com aprovacao (suporte)

## Visao Geral

Implementar `mcadOperationalAgent`, registrar no Mastra e conectar o endpoint `POST /v1/chat` ao agente com contrato tipado de request/response.

## Requisitos

- Agent deve responder em portugues.
- Agent deve ser instruido a usar tools para dados factuais.
- Agent nao pode inventar dados operacionais.
- Agent deve respeitar tool denial sem vazar dados.
- Chave OpenAI deve existir apenas no backend.

## Arquivos Envolvidos

- **Criar:**
  - `services/ai-orchestrator/src/mastra/agents/mcad-operational-agent.ts`
  - `services/ai-orchestrator/src/__tests__/chat.test.ts`
- **Modificar:**
  - `services/ai-orchestrator/src/mastra/index.ts` (registrar agent)
  - `services/ai-orchestrator/src/index.ts` (implementar `POST /v1/chat`)
  - `services/ai-orchestrator/src/schemas/chat.ts` (finalizar contratos)
  - `services/ai-orchestrator/src/config/env.ts` (`OPENAI_MODEL`, limites)
- **Referencia:**
  - `tasks/plataforma/prd-copiloto-operacional-mastra/techspec.md`
  - Documentacao Mastra sobre agents/tools
- **Skills para consultar durante implementacao:**
  - `restful-api` — contrato JSON e status HTTP
  - Padroes locais Node/Fastify — handlers e testes

## Subtarefas

- [x] 4.1 Criar agent com instrucoes operacionais da Tech Spec.
- [x] 4.2 Configurar provider OpenAI via env, sem modelo hard-coded definitivo fora de fallback seguro.
- [x] 4.3 Implementar `chatRequestSchema` e `chatResponseSchema`.
- [x] 4.4 Implementar endpoint `POST /v1/chat` com `threadId`, resposta e resumo de tool calls.
- [x] 4.5 Implementar limite de tamanho de mensagem e erro 422 para payload invalido.
- [x] 4.6 Criar testes com provider/tool mockado para resposta de chat.

## Sequenciamento

- Bloqueado por: 1.0, 3.0
- Desbloqueia: 5.0, 6.0, 7.0, 8.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: parte de RF-01 e suporte para RF-02/RF-04.
- Evidencia esperada: chat funciona com contexto valido e contrato estavel.

## Detalhes de Implementacao

Instrucoes obrigatorias do agent:

```text
Voce e o copiloto operacional do MCAD.
Use tools para consultar dados de Cadastro, Arrecadacao, Identificacao, Distribuicao e Auditoria.
Nunca invente dados operacionais.
Nao exponha dados quando uma tool negar permissao.
Proponha acoes sensiveis como plano, nao as execute automaticamente.
```

**Convencoes da stack (das skills consultadas):**
- Validar request com Zod antes de chamar o agent.
- Nao retornar stack trace em erro.
- Manter resposta em JSON com `threadId`, `answer`, `toolCalls` e `suspendedWorkflow?`.

## Criterios de Sucesso (Verificaveis)

- [x] Testes passam: `cd services/ai-orchestrator && npm test`
- [x] Build compila sem erros: `cd services/ai-orchestrator && npm run build`
- [x] `POST /v1/chat` com payload invalido retorna 422
- [x] `POST /v1/chat` sem contexto valido retorna 401/403
- [x] Resposta valida contem `threadId`, `answer` e `toolCalls`
