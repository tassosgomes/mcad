---
status: completed
parallelizable: false
blocked_by: [4.0, 5.0, 6.0]
---

<task_context>
<domain>plataforma/ai-orchestrator/workflows</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>external_apis,database</dependencies>
<unblocks>8.0, 9.0, 10.0</unblocks>
</task_context>

# Tarefa 7.0: Implementar workflows Mastra operacionais e suspensao para aprovacao

## Relacionada as User Stories

- HU-01 Consultar obra por linguagem natural (cobertura direta)
- HU-03 Validar pre-requisitos de distribuicao (cobertura direta)
- HU-04 Executar fluxo com aprovacao (cobertura direta)

## Visao Geral

Implementar os workflows `explicarObraWorkflow`, `validarDistribuicaoWorkflow` e `prepararAcaoSensivelWorkflow`, com steps tipados, execucao paralela onde couber e suspensao para aprovacao humana em acoes sensiveis.

## Requisitos

- Workflows devem retornar resultado estruturado.
- Falhas parciais devem ser preservadas como avisos.
- `prepararAcaoSensivelWorkflow` nao deve executar escrita no MVP.
- Endpoint de workflow deve iniciar e retomar execucoes.

## Arquivos Envolvidos

- **Criar:**
  - `services/ai-orchestrator/src/mastra/workflows/explicar-obra-workflow.ts`
  - `services/ai-orchestrator/src/mastra/workflows/validar-distribuicao-workflow.ts`
  - `services/ai-orchestrator/src/mastra/workflows/preparar-acao-sensivel-workflow.ts`
  - `services/ai-orchestrator/src/__tests__/workflows.test.ts`
- **Modificar:**
  - `services/ai-orchestrator/src/mastra/index.ts` (registrar workflows)
  - `services/ai-orchestrator/src/index.ts` (implementar endpoints de workflow)
  - `services/ai-orchestrator/src/schemas/chat.ts` (schemas de workflow se necessario)
- **Referencia:**
  - `tasks/plataforma/prd-copiloto-operacional-mastra/techspec.md`
  - Documentacao Mastra de workflows, agents/tools e suspend/resume
- **Skills para consultar durante implementacao:**
  - `restful-api` — endpoints de workflow e status HTTP
  - Padroes locais Node/Fastify — testes de handlers

## Subtarefas

- [x] 7.1 Implementar `explicarObraWorkflow`: normalizar entrada, buscar obra, consultar titulares/fonogramas/auditoria em paralelo e consolidar.
- [x] 7.2 Implementar `validarDistribuicaoWorkflow`: consultar rubrica/periodo, rol fechado, verba disponivel e processo existente.
- [x] 7.3 Implementar `prepararAcaoSensivelWorkflow`: criar proposta, validar permissao e suspender sem escrever dados.
- [x] 7.4 Implementar endpoints `POST /v1/workflows/:workflowId/runs` e `/resume`.
- [x] 7.5 Criar testes de sucesso, falha parcial e suspensao.

## Sequenciamento

- Bloqueado por: 4.0, 5.0, 6.0
- Desbloqueia: 8.0, 9.0, 10.0
- Paralelizavel: Nao (orquestra tools e endpoints existentes)

## Rastreabilidade

- Esta tarefa cobre: RF-04 e RF-05.
- Evidencia esperada: workflows executam steps tipados e retornam estado suspenso quando necessario.

## Detalhes de Implementacao

Resultado esperado para validacao de distribuicao:

```ts
type ValidarDistribuicaoResult = {
  apto: boolean;
  bloqueios: string[];
  avisos: string[];
  fontes: Array<{ toolId: string; status: 'success' | 'denied' | 'error' }>;
};
```

**Convencoes da stack (das skills consultadas):**
- Preferir workflow deterministico para processos multi-etapa.
- Usar `parallel`/steps paralelos apenas quando as chamadas forem independentes.
- Em suspensao, retornar `workflowId`, `runId` e `stepId`.

## Criterios de Sucesso (Verificaveis)

- [x] Testes de workflow passam: `cd services/ai-orchestrator && npm test -- --test-name-pattern workflows`
- [x] Build compila sem erros: `cd services/ai-orchestrator && npm run build`
- [x] `explicarObraWorkflow` preserva achados parciais quando auditoria falha
- [x] `validarDistribuicaoWorkflow` retorna `apto`, `bloqueios`, `avisos`, `fontes`
- [x] `prepararAcaoSensivelWorkflow` suspende e nao executa escrita
