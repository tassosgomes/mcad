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
  - `frontend/src/features/identificacao/captacoes/types/cancelamento.ts`
  - `frontend/src/features/identificacao/captacoes/api/cancelamentoApi.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/usePodeCancelar.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useCancelarRol.ts`
- **Modificar:**
  - `frontend/src/features/identificacao/captacoes/types/captacao.ts` (adicionar campos distribuicaoProcessada, justificativaCancelamento, canceladoEm)

## Subtarefas

- [ ] 6.1 Criar `cancelamento.ts` (OpcaoRecriacao, CancelarRolRequest, CancelamentoResponse, PodeCancelarResponse)
- [ ] 6.2 Atualizar `captacao.ts` com novos campos da Captação
- [ ] 6.3 Criar `cancelamentoApi.ts` (podeCancelar, cancelarRol)
- [ ] 6.4 Criar `usePodeCancelar` — staleTime 0, enabled quando FECHADA
- [ ] 6.5 Criar `useCancelarRol` — mutation com navegação condicional (novaCaptacaoId → detalhe, senão → listagem)

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 7.0
- Paralelizável: Sim

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build`
- [ ] TypeScript: `cd frontend && npx tsc --noEmit`
- [ ] useCancelarRol navega para nova captação se novaCaptacaoId preenchido
