---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>engine/bff/authz</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>external_apis,http_server</dependencies>
<unblocks>"6.0, 8.0"</unblocks>
</task_context>

# Tarefa 2.0: Implementar no BFF a consulta governada de papeis vinculados e elegibilidade de remocao

## Visao Geral

Adicionar ao BFF a rota que enriquece o detalhe da permissao com os papeis vinculados e a elegibilidade de remocao. Como a OpenAPI atual do `ecad-authz` nao expoe `GET /permissions/{id}/roles`, a implementacao precisa fazer agregacao controlada via `GET /v1/roles` e `GET /v1/roles/{roleId}/permissions`.

## Requisitos

- Criar `GET /api/autorizacao/permissoes/:id/papeis-vinculados`.
- Reaproveitar o bearer do usuario e manter autorizacao server-side.
- Retornar, no minimo:
  - `linkedRoles`
  - `canRemove`
  - `blockingReason`
- Considerar removivel apenas quando:
  - a permissao estiver `DEPRECATED`;
  - nao houver papeis ativos vinculados.
- Normalizar erros de `authz` e de fan-out do BFF.

## Subtarefas

- [ ] 2.1 Criar modulo de rotas/utilitarios para lifecycle de permissao no BFF
- [ ] 2.2 Implementar fetch do detalhe da permissao via `GET /v1/permissions/{id}`
- [ ] 2.3 Implementar fetch do catalogo de papeis via `GET /v1/roles`
- [ ] 2.4 Implementar fan-out para `GET /v1/roles/{roleId}/permissions` e filtragem por permissao
- [ ] 2.5 Montar `PermissionRemovalEligibility` com `linkedRoles`, `canRemove` e `blockingReason`
- [ ] 2.6 Garantir que apenas papeis `ACTIVE` entrem no bloqueio de remocao
- [ ] 2.7 Mapear erros 401/403/404/503 em envelope consistente
- [ ] 2.8 Cobrir o endpoint com testes de unidade/integracao no padrao do BFF

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 6.0, 8.0
- Paralelizavel: Sim (pode rodar em paralelo com 3.0 e 4.0)

## Detalhes de Implementacao

- Arquivos provaveis:
  - `services/bff/src/authzPermissionLifecycleRoutes.ts`
  - `services/bff/src/authzPermissionLifecycleRoutes.test.ts`
  - `services/bff/src/server.ts`
- Reutilizar:
  - `services/bff/src/authzContext.ts`
  - `services/bff/src/proxy.ts`
  - `services/bff/src/acessosRoutes.ts`
- O endpoint deve devolver uma resposta pronta para consumo direto da `PermissionDetailPage`, reduzindo regra duplicada no frontend.

## Criterios de Sucesso

- O BFF expoe `GET /api/autorizacao/permissoes/:id/papeis-vinculados`
- A resposta lista corretamente os papeis vinculados ativos
- `canRemove` e `blockingReason` refletem corretamente status e vinculacao
- Testes cobrem permissao sem vinculos, com vinculos e com status nao depreciado
