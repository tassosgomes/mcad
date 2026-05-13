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

# Tarefa 5.0: Implementar tools read-only de Authz e Cadastro

## Relacionada as User Stories

- HU-01 Consultar obra por linguagem natural (cobertura direta)

## Visao Geral

Implementar as primeiras tools do MVP: `consultarPermissoesUsuario`, `buscarObra`, `buscarFonograma` e `buscarTitular`, todas somente leitura, tipadas com Zod e protegidas por permissao.

## Requisitos

- Tools devem usar `createTool`, `inputSchema` e `outputSchema`.
- Tools devem validar permissao antes de chamar APIs.
- Tools devem propagar token e request ID.
- Tools devem sanitizar dados retornados ao modelo.
- Nenhuma tool pode executar escrita.

## Arquivos Envolvidos

- **Criar:**
  - `services/ai-orchestrator/src/mastra/tools/authz-tool.ts`
  - `services/ai-orchestrator/src/mastra/tools/cadastro-tools.ts`
  - `services/ai-orchestrator/src/__tests__/tools.test.ts`
- **Modificar:**
  - `services/ai-orchestrator/src/mastra/agents/mcad-operational-agent.ts` (registrar tools)
  - `services/ai-orchestrator/src/mastra/index.ts` (exportar tools)
  - `services/ai-orchestrator/src/config/env.ts` (URLs e timeouts)
- **Referencia:**
  - `domains/cadastro/domain.md`
  - `docs/migracao-authz/prd.md`
  - `services/bff/README.md`
- **Skills para consultar durante implementacao:**
  - `restful-api` — chamadas HTTP e status 403/404/422
  - `react-production-readiness` — sanitizacao de dados sensiveis

## Subtarefas

- [x] 5.1 Implementar `consultarPermissoesUsuario` chamando `ecad-authz` ou endpoint equivalente.
- [x] 5.2 Implementar `buscarObra` por termo, ID, titulo, ISWC ou codigo interno.
- [x] 5.3 Implementar `buscarFonograma` por termo, ID, ISRC ou titulo.
- [x] 5.4 Implementar `buscarTitular` por termo, ID, nome ou documento, com mascaramento de documento.
- [x] 5.5 Padronizar outputs com campos minimos e sem payload bruto desnecessario.
- [x] 5.6 Testar sucesso, input invalido, permissao negada e erro de upstream.

## Sequenciamento

- Bloqueado por: 3.0, 4.0
- Desbloqueia: 7.0
- Paralelizavel: Sim, em paralelo com 6.0

## Rastreabilidade

- Esta tarefa cobre: RF-02 e RF-03 para tools Must Have.
- Evidencia esperada: agent consegue consultar Cadastro sem vazar dados de usuarios sem permissao.

## Detalhes de Implementacao

Permissoes candidatas a confirmar com `ecad-authz`:

```text
cadastro.obras.read
cadastro.fonogramas.read
cadastro.titulares.read
authz.permissions.read
```

Se o catalogo real usar outros nomes, adaptar as constantes sem alterar o comportamento esperado.

**Convencoes da stack (das skills consultadas):**
- Zod para input/output.
- `unknown` + narrowing para erros de upstream.
- Logs sem CPF/CNPJ completo, tokens ou documentos.
- Testes de tool devem mockar HTTP, nao chamar servicos reais.

## Criterios de Sucesso (Verificaveis)

- [x] Testes de tools passam: `cd services/ai-orchestrator && npm test -- --test-name-pattern tools`
- [x] Build compila sem erros: `cd services/ai-orchestrator && npm run build`
- [x] Tool sem permissao retorna status `denied`/erro 403 controlado
- [x] Documento de titular retorna mascarado quando aparecer em resposta ao modelo
- [x] Nenhuma tool usa metodo HTTP de escrita
