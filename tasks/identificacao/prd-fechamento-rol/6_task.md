---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>none</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Frontend — Types, API Client e Hooks

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/types/fechamento.ts`
  - `frontend/src/features/identificacao/captacoes/api/fechamentoApi.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/usePreRequisitos.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useFecharRol.ts`

## Subtarefas

- [x] 6.1 Criar `fechamento.ts` (PreRequisitoItem, ResumoFechamento, PreRequisitosResponse, FechamentoResponse)
- [x] 6.2 Criar `fechamentoApi.ts` (getPreRequisitos, fecharRol)
- [x] 6.3 Criar `usePreRequisitos` — staleTime 0, enabled quando modal aberto
- [x] 6.4 Criar `useFecharRol` — mutation, invalidate captacoes + pendentes

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 7.0
- Paralelizável: Sim

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd frontend && npm run build`
- [x] TypeScript: `cd frontend && npx tsc --noEmit`
- [x] usePreRequisitos com staleTime 0 (sempre dados frescos)
- [x] useFecharRol invalida captacoes e pendentes
