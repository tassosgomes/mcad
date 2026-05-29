---
status: completed
parallelizable: true
blocked_by: [1.0]
---

<task_context>
<domain>engine/bff/acessos</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>fastify,ecad-authz,jwt</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 4.0: Implementar rotas BFF de gestão de acessos (filtro escopado + atribuir/remover/catálogo)

## Relacionada às User Stories

- [US-04] Gestor de Acessos (atribuir/remover papéis) — cobertura direta
- [US-05] Auditor / Compliance Officer (Consultor de Acessos + escopo do Gerente) — cobertura direta
- [US-03] Gerente de Distribuição (ver assignments escopados) — cobertura direta

## Visão Geral

Adicionar as rotas `/api/acessos/*` ao BFF (Fastify/TypeScript), implementando o filtro escopado do Gerente (RF-05) e o wrapper para atribuir/remover papéis no `ecad-authz`. Esta é a tarefa que materializa a decisão arquitetural do ADR 0008 (BFF como gateway cross-cutting).

A lógica central: BFF inspeciona o `authorization-context` do caller para decidir entre listar global ou escopado por domínios `acessos:{dominio}:papel:visualizar`.

## Requisitos

- 4 endpoints novos: `GET /api/acessos/assignments`, `GET /api/acessos/papeis`, `POST /api/acessos/papeis/atribuir`, `DELETE /api/acessos/papeis/atribuir/:assignmentId`.
- Filtro escopado por domínio: usuário com `acessos:default:papel:listar` vê tudo; usuário com apenas `acessos:{dominio}:papel:visualizar` vê só `{dominio}`.
- Envelope de erro `ErrorResponse {code, message, correlationId}`.
- Cobertura de testes: sem JWT (401), sem permissão (403), com permissão escopada, com permissão completa, upstream 503.
- Logs estruturados de toda atribuição/remoção (audit trail próprio, redundante com `ecad-authz`).
- Modularização (`acessosRoutes.ts` em arquivo próprio).

## Arquivos Envolvidos

- **Criar:**
  - `services/bff/src/acessosRoutes.ts`
  - `services/bff/src/acessosRoutes.test.ts`
- **Modificar:**
  - `services/bff/src/server.ts` (registrar `registerAcessosRoutes`)
- **Referência:**
  - `services/bff/src/meRoutes.ts` (padrão de resolução de `authorization-context`; helpers `extractBearer`, `resolveAuthorizationContext`)
  - `services/bff/src/meCache.ts` (estrutura do payload `AuthorizationContextPayload`)
  - `services/bff/src/config.ts` (config existente)
  - `docs/adr/0008-bff-gateway-cross-cutting.md`
  - `seeds/mcad/acessos.permissions.json` (chaves de permissão a verificar)
  - `/home/tsgomes/github-tassosgomes/ecad-authz/docs/` (contrato dos endpoints `/v1/users` e `/v1/users/{id}/roles`)
- **Skills para consultar:**
  - `common-restful-api` — envelope `ErrorResponse`, status codes
  - `react-architecture` (consumer side) — não afeta o BFF, mas o contrato deve ser amigável

## Subtarefas

- [ ] 4.1 Refatorar `meRoutes.ts` extraindo helpers reusáveis (`resolveAuthzContext`, `sendError`) para um módulo compartilhado (ex.: `authzContext.ts`), se ainda não estiverem em módulo
- [ ] 4.2 Criar `acessosRoutes.ts` com helper `deriveScopedDomains(permissions: string[]): { allDomains: boolean, scoped: string[] }`
- [ ] 4.3 Implementar `GET /api/acessos/assignments?page=&size=&query=`: resolver contexto, derivar escopo, chamar `ecad-authz GET /v1/users?...`, filtrar resultado por domínios, enriquecer com papéis, devolver
- [ ] 4.4 Implementar `GET /api/acessos/papeis`: proxy de `ecad-authz GET /v1/roles` (filtrado por permissão `acessos:default:papel:listar`)
- [ ] 4.5 Implementar `POST /api/acessos/papeis/atribuir`: validar `acessos:default:papel:atribuir`, proxar `POST /v1/users/{id}/roles`
- [ ] 4.6 Implementar `DELETE /api/acessos/papeis/atribuir/:assignmentId`: validar `acessos:default:papel:remover`, proxar `DELETE`
- [ ] 4.7 Logs estruturados (`request.log.info`) para cada atribuição/remoção com `{actor, target, role, outcome}`
- [ ] 4.8 Métricas RED (counter por endpoint, histogram de latência) — usar padrão atual de Fastify metrics se já presente; senão, marcar como TODO
- [ ] 4.9 Registrar `registerAcessosRoutes` em `server.ts`
- [ ] 4.10 Testes em `acessosRoutes.test.ts` — cobrir todos os cenários listados em Requisitos
- [ ] 4.11 Documentar payload de cada endpoint num bloco de comentário no topo do arquivo `acessosRoutes.ts`

## Sequenciamento

- Bloqueado por: 1.0 (precisa das permissões `acessos:*` registradas)
- Desbloqueia: 6.0 (frontend de Acessos)
- Paralelizável: Sim — pode rodar em paralelo a 2.0, 3.0, 5.0 (atenção: 4.0 e 5.0 ambos modificam `server.ts` — coordenar merge)

## Rastreabilidade

- Esta tarefa cobre: RF-04 (perfis Acessos), RF-05 (filtro escopado)
- Evidência esperada: testes integration cobrindo: usuário Gestor lista assignments globais; usuário Gerente Distribuição lista apenas Distribuição; usuário sem permissão recebe 403; atribuição via Gestor → 200 e log estruturado

## Detalhes de Implementação

### Helper de escopo

```typescript
// services/bff/src/acessosRoutes.ts (trecho)

interface ScopedAccess {
  allDomains: boolean;
  scoped: string[]; // ex.: ['distribuicao']
}

export function deriveScopedDomains(permissions: string[]): ScopedAccess {
  if (permissions.includes('acessos:default:papel:listar')) {
    return { allDomains: true, scoped: [] };
  }
  const scoped = permissions
    .filter(p => /^acessos:[a-z-]+:papel:visualizar$/.test(p))
    .map(p => p.split(':')[1])
    .filter(d => d !== 'default');
  return { allDomains: false, scoped };
}
```

### Skeleton de `GET /api/acessos/assignments`

```typescript
server.get('/api/acessos/assignments', async (request, reply) => {
  const ctx = await resolveAuthzContext(request, reply, options);
  if (!ctx) return;

  const access = deriveScopedDomains(ctx.permissions);
  if (!access.allDomains && access.scoped.length === 0) {
    return reply.code(403).send({ code: 'PERMISSION_DENIED' });
  }

  const query = request.query as { page?: string; size?: string; query?: string };
  const upstream = await fetchEcadAuthzUsers(opts, query, ctx.token);
  if (!upstream.ok) {
    return reply.code(upstream.status).send(upstream.body);
  }

  const enriched = await enrichWithRoles(opts, upstream.users, ctx.token);
  const filtered = access.allDomains
    ? enriched
    : enriched.map(u => ({
        ...u,
        roles: u.roles.filter(r => access.scoped.includes(r.domain))
      })).filter(u => u.roles.length > 0);

  return reply.code(200).send({
    items: filtered,
    page: upstream.page,
    size: upstream.size,
    total: upstream.total
  });
});
```

### Estrutura de resposta de `/api/acessos/assignments`

```typescript
interface AssignmentItem {
  subject: string;          // sub do JWT (Logto)
  email?: string;
  name?: string;
  roles: Array<{
    key: string;            // ex.: 'distribuicao.default.gerente'
    domain: string;         // ex.: 'distribuicao'
    displayName: string;
  }>;
}
```

### Skeleton de `POST /api/acessos/papeis/atribuir`

```typescript
server.post('/api/acessos/papeis/atribuir', async (request, reply) => {
  const ctx = await resolveAuthzContext(request, reply, options);
  if (!ctx) return;

  if (!ctx.permissions.includes('acessos:default:papel:atribuir')) {
    return reply.code(403).send({ code: 'PERMISSION_DENIED' });
  }

  const body = request.body as { userId: string; roleKey: string };
  const result = await postEcadAuthzAssignment(opts, body.userId, body.roleKey, ctx.token);

  if (result.ok) {
    request.log.info({
      action: 'acessos.papel.atribuir',
      actor: ctx.subject,
      target: body.userId,
      role: body.roleKey,
      outcome: 'ok'
    }, 'role assigned');
    return reply.code(204).send();
  }

  return reply.code(result.status).send(result.body);
});
```

### Testes (`acessosRoutes.test.ts`) — cenários

```
1. GET /api/acessos/assignments sem Authorization → 401 {code: UNAUTHORIZED}
2. GET .../assignments com JWT sem permissão → 403 {code: PERMISSION_DENIED}
3. GET .../assignments com 'acessos:default:papel:listar' → lista TODOS os usuários (mock authz)
4. GET .../assignments com APENAS 'acessos:distribuicao:papel:visualizar' → lista escopada a Distribuição
5. GET .../assignments com authz upstream 503 → BFF devolve 503 {code: AUTHZ_UNAVAILABLE}
6. POST .../papeis/atribuir sem 'papel:atribuir' → 403
7. POST .../papeis/atribuir com permissão + body válido → 204 + log de audit registrado
8. DELETE .../papeis/atribuir/{id} sem permissão → 403
9. DELETE .../papeis/atribuir/{id} com permissão → 204
10. GET .../papeis sem 'papel:listar' → 403; com permissão → 200 com catálogo
```

**Convenções da stack (das skills consultadas):**

- Envelope `ErrorResponse {code, message?, correlationId?}` consistente com o resto do mcad (`common-restful-api`)
- Fastify schemas opcional mas recomendado (`request.body as ...` é tipagem manual; preferir Zod/AJV se já houver padrão)
- Logs estruturados via `request.log` (Pino default do Fastify)
- Testes em estilo do projeto: `tap` ou `node:test`; usar mesma stack do `server.test.ts` existente

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/bff && npm run build` sem erros
- [ ] Lint: `cd services/bff && npm run lint` sem warnings
- [ ] Testes: `cd services/bff && npm test -- acessosRoutes` — 10 cenários verdes
- [ ] Cobertura unitária do helper `deriveScopedDomains` ≥ 95%
- [ ] Manual (após DEV seed da Tarefa 1.0):
  - `curl -sH "Authorization: Bearer $JWT_GESTOR_ACESSOS_DEV" $BFF/api/acessos/assignments | jq '.items | length'` retorna ≥ 7 (todos os usuários de teste)
  - `curl -sH "Authorization: Bearer $JWT_GERENTE_DEV" $BFF/api/acessos/assignments | jq '.items[] | .roles[].domain'` mostra apenas `"distribuicao"`
  - `curl -sH "Authorization: Bearer $JWT_CONSULTOR_DEV" $BFF/api/acessos/assignments` retorna 403
- [ ] Logs estruturados aparecem em stdout do BFF durante teste de atribuição
