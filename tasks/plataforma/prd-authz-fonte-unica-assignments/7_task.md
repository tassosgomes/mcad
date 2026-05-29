---
status: pending
parallelizable: true
blocked_by: ["5.0"]
---

<task_context>
<domain>plataforma/servicos-auxiliares/ai-orchestrator</domain>
<type>implementation</type>
<scope>security</scope>
<complexity>medium</complexity>
<dependencies>bff,ecad-authz,jwt,http_server</dependencies>
<unblocks>8.0</unblocks>
</task_context>

# Tarefa 7.0: Remover autorizacao por roles/scopes JWT de servicos auxiliares

## Relacionada as User Stories

- Desenvolvedor de Servico nao reimplementa autorizacao com roles/scopes do token.
- Usuario MCAD recebe deny seguro se o contexto efetivo nao trouxer permissao.

## Visao Geral

Atualizar `ai-orchestrator` e demais pontos auxiliares para nao aceitar roles/scopes do JWT como permissao de negocio. O runtime deve receber contexto resolvido pelo BFF ou consultar `ecad-authz` antes de executar tools/workflows.

## Requisitos

- `assertPermission` ou equivalente deve usar apenas permissoes efetivas resolvidas.
- Remover fallback administrativo por role (`admin`, `super-admin`) ou substituir por permissao explicita.
- Scopes do JWT podem autenticar/audience, mas nao conceder permissao de negocio.
- Eventos de auditoria podem registrar roles como diagnostico legado apenas se nao influenciarem decisao.
- Busca estatica deve cobrir `roles`, `hasRole`, `scope`, `x-mcad-roles`, `permissions` e claims customizadas.

## Arquivos Envolvidos

- **Modificar:**
  - `services/ai-orchestrator/src/http/auth-context.ts`
  - `services/ai-orchestrator/src/schemas/runtime-context.ts`
  - `services/ai-orchestrator/src/mastra/tools/*`
  - `services/ai-orchestrator/src/mastra/workflows/*`
  - `services/ai-orchestrator/src/__tests__/*`
  - `services/bff/src/proxy.ts` ou rota BFF de AI se injeta contexto interno
- **Referencia:**
  - `tasks/plataforma/prd-copiloto-operacional-mastra/*`
  - `services/bff/src/authzContext.ts`
  - `services/bff/src/meRoutes.ts`

## Subtarefas

- [ ] 7.1 Fazer busca estatica por roles/scopes usados como autorizacao em `ai-orchestrator`, BFF proxy e scripts auxiliares.
- [ ] 7.2 Definir contrato `ResolvedRuntimeAuthorization` com `userId`, `displayName`, `permissions` e `authzVersion`.
- [ ] 7.3 Ajustar BFF/proxy para injetar contexto efetivo por headers internos assinados ou payload server-to-server.
- [ ] 7.4 Ajustar `ai-orchestrator` para consultar `ecad-authz` quando contexto efetivo nao vier do BFF.
- [ ] 7.5 Remover fallback por role/scope em `assertPermission`.
- [ ] 7.6 Garantir deny seguro quando contexto efetivo estiver ausente, expirado ou sem permissao exigida.
- [ ] 7.7 Atualizar eventos de auditoria/observabilidade para registrar `authzVersion` e outcome sem token.
- [ ] 7.8 Adicionar testes para rejeicao sem permissoes efetivas, permissao concedida e role JWT ignorada.

## Sequenciamento

- Bloqueado por: 5.0
- Desbloqueia: 8.0
- Paralelizavel: Sim. Pode rodar em paralelo ao frontend depois que o BFF define o contrato de contexto efetivo.

## Rastreabilidade

- Cobre RF-06 e apoia RF-07.
- Evidencia esperada: JWT com role administrativa nao concede tool/workflow sem permissao efetiva.

## Detalhes de Implementacao

Contrato alvo:

```ts
interface ResolvedRuntimeAuthorization {
  userId: string;
  displayName?: string;
  permissions: string[];
  authzVersion: number;
}
```

Qualquer permissao de tool deve ser comparada contra `permissions`. `scope` do token deve ser tratado como autenticacao/audience, nao autorizacao de negocio.

## Criterios de Sucesso Verificaveis

- [ ] `cd services/ai-orchestrator && npm test` passa.
- [ ] Build do `ai-orchestrator` passa.
- [ ] Teste comprova que role `admin` no JWT e ignorada.
- [ ] Teste comprova que scope `write` no JWT nao concede permissao de tool.
- [ ] Contexto sem `permissions` efetivas retorna 403/deny seguro.
- [ ] Logs nao expoem JWT nem headers internos sensiveis.
