---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"10.0, 11.0, 12.0"</unblocks>
</task_context>

# Tarefa 9.0: Feature — Types + API (5 funções) + Hooks (5 hooks)

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/participacoes/types/participacao.ts`
  - `frontend/src/features/cadastro/participacoes/api/participacoesApi.ts`
  - `frontend/src/features/cadastro/participacoes/hooks/useParticipacoes.ts`
  - `frontend/src/features/cadastro/participacoes/hooks/useAddParticipacao.ts`
  - `frontend/src/features/cadastro/participacoes/hooks/useAjustarPercentual.ts`
  - `frontend/src/features/cadastro/participacoes/hooks/useRemoveParticipacao.ts`
  - `frontend/src/features/cadastro/participacoes/hooks/useCalcularPercentuais.ts`
- **Referência:**
  - `tasks/prd-participacao-conexa/api-contract.yaml`
  - `features/cadastro/titularidades/` (padrão)

## Subtarefas

- [ ] 9.1 Types: ParticipacaoItem (percentual nullable, editavel), ParticipacoesResponse (somaCalculada, percentuaisDesatualizados), AdicionarRequest (sem percentual), AjustarRequest
- [ ] 9.2 API functions: getParticipacoes, adicionarParticipacao, ajustarPercentual, removerParticipacao (apiDeleteWithBody), calcularPercentuais (POST sem body útil)
- [ ] 9.3 Hooks: useParticipacoes (query), useAddParticipacao, useAjustarPercentual, useRemoveParticipacao, useCalcularPercentuais — todos com setQueryData
- [ ] 9.4 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Tipos com percentual nullable e editavel boolean
- [ ] calcularPercentuais envia POST (pode ser body vazio `{}`)
