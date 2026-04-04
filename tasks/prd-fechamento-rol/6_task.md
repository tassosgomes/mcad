---
status: pending
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

- [ ] 6.1 Criar `fechamento.ts` (PreRequisitoItem, ResumoFechamento, PreRequisitosResponse, FechamentoResponse)
- [ ] 6.2 Criar `fechamentoApi.ts` (getPreRequisitos, fecharRol)
- [ ] 6.3 Criar `usePreRequisitos` — staleTime 0, enabled quando modal aberto
- [ ] 6.4 Criar `useFecharRol` — mutation, invalidate captacoes + pendentes

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 7.0
- Paralelizável: Sim

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build`
- [ ] TypeScript: `cd frontend && npx tsc --noEmit`
- [ ] usePreRequisitos com staleTime 0 (sempre dados frescos)
- [ ] useFecharRol invalida captacoes e pendentes
