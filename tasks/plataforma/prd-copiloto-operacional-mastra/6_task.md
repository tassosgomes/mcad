---
status: completed
parallelizable: true
blocked_by: [3.0, 4.0]
---

<task_context>
<domain>plataforma/ai-orchestrator/tools</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>external_apis,http_server</dependencies>
<unblocks>7.0</unblocks>
</task_context>

# Tarefa 6.0: Implementar tools read-only de Arrecadacao, Distribuicao e Auditoria

## Relacionada as User Stories

- HU-02 Investigar pagamento (cobertura direta)
- HU-03 Validar pre-requisitos de distribuicao (cobertura parcial)

## Visao Geral

Adicionar tools read-only para consultar pagamento/verba, processo de distribuicao e auditoria operacional, permitindo respostas e workflows cross-domain.

## Requisitos

- Implementar `consultarPagamento`, `consultarProcessoDistribuicao` e `consultarAuditoria`.
- Checar permissao por dominio antes da chamada.
- Retornar estruturas reduzidas e explicaveis.
- Tratar falha de upstream como erro degradavel para workflows.

## Arquivos Envolvidos

- **Criar:**
  - `services/ai-orchestrator/src/mastra/tools/arrecadacao-tools.ts`
  - `services/ai-orchestrator/src/mastra/tools/distribuicao-tools.ts`
  - `services/ai-orchestrator/src/mastra/tools/auditoria-tools.ts`
- **Modificar:**
  - `services/ai-orchestrator/src/mastra/agents/mcad-operational-agent.ts` (registrar tools)
  - `services/ai-orchestrator/src/mastra/index.ts` (exportar tools)
  - `services/ai-orchestrator/src/__tests__/tools.test.ts` (expandir cobertura)
- **Referencia:**
  - `domains/arrecadacao/domain.md`
  - `domains/distribuicao/domain.md`
  - `docs/events.md`
  - `services/bff/README.md`
- **Skills para consultar durante implementacao:**
  - `restful-api` — codigos HTTP e erro padronizado
  - `react-production-readiness` — minimizacao/sanitizacao de dados

## Subtarefas

- [x] 6.1 Implementar `consultarPagamento` com filtros por ID, rubrica e periodo quando suportado.
- [x] 6.2 Implementar `consultarProcessoDistribuicao` por ID, rubrica/periodo ou status.
- [x] 6.3 Implementar `consultarAuditoria` por entidade/tipo/ID, com limite de itens.
- [x] 6.4 Definir outputs com `fontes`, `status`, `avisos` e dados minimos.
- [x] 6.5 Implementar tratamento de erro degradavel para 404/5xx.
- [x] 6.6 Testar sucesso, sem permissao, input invalido e upstream indisponivel.

## Sequenciamento

- Bloqueado por: 3.0, 4.0
- Desbloqueia: 7.0
- Paralelizavel: Sim, em paralelo com 5.0

## Rastreabilidade

- Esta tarefa cobre: RF-02 e RF-03 para tools Should Have.
- Evidencia esperada: workflows conseguem consumir dados cross-domain com seguranca.

## Detalhes de Implementacao

Permissoes candidatas:

```text
arrecadacao.pagamentos.read
arrecadacao.verbas.read
distribuicao.processos.read
auditoria.eventos.read
```

Os nomes devem ser ajustados ao catalogo real do `ecad-authz`.

**Convencoes da stack (das skills consultadas):**
- Outputs nao devem repassar payloads inteiros das APIs.
- Colecoes devem ter limite/paginacao.
- Erros de negocio devem ser distintos de erros tecnicos.

## Criterios de Sucesso (Verificaveis)

- [x] Testes de tools passam: `cd services/ai-orchestrator && npm test -- --test-name-pattern tools`
- [x] Build compila sem erros: `cd services/ai-orchestrator && npm run build`
- [x] Consulta sem permissao retorna 403 controlado
- [x] Falha 500 de upstream vira erro degradavel sem stack trace
- [x] `consultarAuditoria` aplica limite de resultados
