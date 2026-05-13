---
status: completed
parallelizable: true
blocked_by: [2.0, 4.0]
---

<task_context>
<domain>frontend/copiloto</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>10.0</unblocks>
</task_context>

# Tarefa 8.0: Implementar UI React do Copiloto

## Relacionada as User Stories

- HU-01 Consultar obra por linguagem natural (cobertura direta)
- HU-02 Investigar pagamento (cobertura direta)
- HU-03 Validar pre-requisitos de distribuicao (cobertura direta)
- HU-04 Executar fluxo com aprovacao (cobertura direta)

## Visao Geral

Criar a feature React `copiloto` com pagina de chat, cliente de API, historico de mensagens, lista de tools executadas e componente de aprovacao para workflows suspensos.

## Requisitos

- Criar rota protegida para o Copiloto.
- UI deve seguir `frontend/DESIGN.md` e reutilizar componentes existentes.
- API client deve chamar apenas o BFF (`/api/ai/v1/*`).
- UI deve mostrar loading, erro, resposta vazia e falha de permissao.
- Workflow suspenso deve exibir proposta e botoes de aprovar/cancelar.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/copiloto/index.ts`
  - `frontend/src/features/copiloto/pages/CopilotoPage.tsx`
  - `frontend/src/features/copiloto/pages/CopilotoPage.module.css`
  - `frontend/src/features/copiloto/api/copilotoApi.ts`
  - `frontend/src/features/copiloto/types/copiloto.ts`
  - `frontend/src/features/copiloto/components/ChatPanel.tsx`
  - `frontend/src/features/copiloto/components/ChatPanel.module.css`
  - `frontend/src/features/copiloto/components/ToolTraceList.tsx`
  - `frontend/src/features/copiloto/components/ToolTraceList.module.css`
  - `frontend/src/features/copiloto/components/WorkflowApproval.tsx`
  - `frontend/src/features/copiloto/components/WorkflowApproval.module.css`
  - `frontend/src/features/copiloto/pages/CopilotoPage.test.tsx`
  - `frontend/src/features/copiloto/components/ChatPanel.test.tsx`
- **Modificar:**
  - `frontend/src/app/router/routes.tsx` (lazy route)
  - `frontend/src/app/providers/AppProviders.tsx` (somente se houver provider necessario)
  - `frontend/src/shared/components/*` (reusar; criar ajuste apenas se necessario)
- **Referencia:**
  - `frontend/DESIGN.md`
  - `frontend/src/features/distribuicao/index.tsx`
  - `frontend/src/features/arrecadacao/verbas/api/verbasApi.ts`
- **Skills para consultar durante implementacao:**
  - `react-architecture` — feature-based, public API e rotas
  - `react-code-quality` — componentes funcionais, props tipadas, sem `any`
  - `react-testing` — RTL, AAA e queries semanticas
  - `react-observability` — estados de erro e trace context

## Subtarefas

- [x] 8.1 Criar estrutura `frontend/src/features/copiloto`.
- [x] 8.2 Criar tipos `ChatRequest`, `ChatResponse`, `ToolCallSummary`, `SuspendedWorkflow`.
- [x] 8.3 Implementar `copilotoApi.ts` usando `fetch`/cliente existente contra `/api/ai/v1`.
- [x] 8.4 Implementar `ChatPanel` com textarea, botao enviar, historico e loading.
- [x] 8.5 Implementar `ToolTraceList` com status `success`, `denied`, `error`.
- [x] 8.6 Implementar `WorkflowApproval` para workflow suspenso.
- [x] 8.7 Criar `CopilotoPage` e registrar rota protegida.
- [x] 8.8 Testar envio de mensagem, erro de API e exibicao de workflow suspenso.

## Sequenciamento

- Bloqueado por: 2.0, 4.0
- Desbloqueia: 10.0
- Paralelizavel: Sim, com mocks do contrato de chat

## Rastreabilidade

- Esta tarefa cobre: RF-01, experiencia do usuario e parte de RF-05.
- Evidencia esperada: usuario autenticado interage com o Copiloto pela UI sem chamadas diretas a APIs internas.

## Detalhes de Implementacao

Contrato de resposta esperado:

```ts
type ChatResponse = {
  threadId: string;
  answer: string;
  toolCalls: Array<{
    toolId: string;
    status: 'success' | 'denied' | 'error';
  }>;
  suspendedWorkflow?: {
    workflowId: string;
    runId: string;
    stepId: string;
  };
};
```

**Convencoes da stack (das skills consultadas):**
- Componentes em `PascalCase.tsx`; pastas em `kebab-case`.
- Codigo em ingles para componentes, funcoes e variaveis.
- Props tipadas; sem `any`.
- Testes com AAA, `screen.getByRole` e `userEvent`.
- Texto da UI pode permanecer em portugues.

## Criterios de Sucesso (Verificaveis)

- [x] Testes frontend passam: `cd frontend && npm run test -- Copiloto`
- [x] Build frontend passa: `cd frontend && npm run build`
- [x] Rota do Copiloto carrega dentro de `ProtectedRoute`
- [x] Envio de mensagem chama `/api/ai/v1/chat`, nao APIs internas de dominio
- [x] Erro 403 mostra mensagem amigavel sem payload tecnico
