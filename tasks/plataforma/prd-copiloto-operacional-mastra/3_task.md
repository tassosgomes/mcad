---
status: completed
parallelizable: false
blocked_by: [1.0]
---

<task_context>
<domain>plataforma/ai-orchestrator/security</domain>
<type>implementation</type>
<scope>middleware</scope>
<complexity>high</complexity>
<dependencies>http_server,external_apis</dependencies>
<unblocks>4.0, 5.0, 6.0, 7.0, 9.0</unblocks>
</task_context>

# Tarefa 3.0: Implementar RuntimeContext, cliente HTTP interno, autorizacao e redaction

## Relacionada as User Stories

- HU-01 Consultar obra por linguagem natural (suporte)
- HU-02 Investigar pagamento (suporte)
- HU-03 Validar pre-requisitos de distribuicao (suporte)
- HU-04 Executar fluxo com aprovacao (suporte)

## Visao Geral

Implementar os contratos e utilitarios que garantem que agents, tools e workflows recebam identidade, permissoes e request ID de forma consistente, alem de cliente HTTP com timeout e sanitizacao.

## Requisitos

- Criar `McadRuntimeContext` e validacao de contexto.
- Extrair token e headers de request para contexto interno.
- Implementar `assertPermission`.
- Implementar `mcadClient` com timeout, abort signal, token propagado e erro tipado.
- Implementar redaction para CPF, CNPJ, e-mail, tokens e documentos em logs/traces.

## Arquivos Envolvidos

- **Criar:**
  - `services/ai-orchestrator/src/schemas/runtime-context.ts`
  - `services/ai-orchestrator/src/http/auth-context.ts`
  - `services/ai-orchestrator/src/http/mcad-client.ts`
  - `services/ai-orchestrator/src/security/redaction.ts`
  - `services/ai-orchestrator/src/__tests__/runtime-context.test.ts`
  - `services/ai-orchestrator/src/__tests__/redaction.test.ts`
- **Modificar:**
  - `services/ai-orchestrator/src/index.ts` (usar parser de contexto nos endpoints)
  - `services/ai-orchestrator/src/config/env.ts` (timeouts e upstreams)
- **Referencia:**
  - `docs/migracao-authz/prd.md` (autorizacao fina)
  - `services/bff/src/proxy.ts` (headers propagados)
  - `tasks/plataforma/prd-copiloto-operacional-mastra/techspec.md`
- **Skills para consultar durante implementacao:**
  - `react-production-readiness` — sanitizacao de dados sensiveis
  - `restful-api` — codigos 401/403/422 e Problem Details

## Subtarefas

- [x] 3.1 Criar schema Zod para `McadRuntimeContext`.
- [x] 3.2 Criar `buildRuntimeContextFromRequest` exigindo `authorization`, `x-mcad-request-id` ou gerando request ID.
- [x] 3.3 Implementar `assertPermission(runtimeContext, permission)`.
- [x] 3.4 Implementar `mcadClient.get/post` com timeout, query params, token e `AbortSignal`.
- [x] 3.5 Implementar classes/formatos de erro `UnauthorizedError`, `ForbiddenError`, `UpstreamError`, `ValidationError`.
- [x] 3.6 Implementar redaction centralizada e testes para CPF, CNPJ, e-mail, token Bearer e chaves API.

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 4.0, 5.0, 6.0, 7.0, 9.0
- Paralelizavel: Nao (contrato comum para tools/workflows)

## Rastreabilidade

- Esta tarefa cobre: RF-03 e base para RF-06.
- Evidencia esperada: chamadas sem contexto minimo sao recusadas e logs nao vazam dados sensiveis.

## Detalhes de Implementacao

Contrato da Tech Spec:

```ts
export type McadRuntimeContext = {
  userId: string;
  displayName?: string;
  roles: string[];
  permissions: string[];
  accessToken: string;
  requestId: string;
  locale: 'pt-BR';
  environment: 'local' | 'dev' | 'prod';
};
```

**Convencoes da stack (das skills consultadas):**
- Nao usar `any`; usar `unknown` + narrowing em erros.
- Nunca logar tokens ou documentos.
- Erros HTTP devem mapear 401, 403, 422, 500 sem expor stack trace.

## Criterios de Sucesso (Verificaveis)

- [x] Testes passam: `cd services/ai-orchestrator && npm test`
- [x] Build compila sem erros: `cd services/ai-orchestrator && npm run build`
- [x] Request sem token retorna 401
- [x] Permissao ausente gera 403 controlado
- [x] Teste prova que `Bearer secret`, CPF/CNPJ e e-mails sao mascarados
