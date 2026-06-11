# Review da Task 2.0

## 1. Resultado da validacao automatizada

Status: APROVADA

Resumo:

- `services/bff`: build TypeScript (`tsc`) limpo, sem erros ou avisos
- `services/bff`: 128/128 testes passaram (115 baseline + 13 novos da task 2.0)
- lint: nao ha script configurado em `services/bff/package.json`; ausencia pre-existente, nao introduzida por esta task
- typecheck: coberto pelo build (`tsc -p tsconfig.json`)

## 2. Comandos executados

```bash
cd /home/tsgomes/mcad/services/bff && npm run build
```

Resultado: sucesso (saida vazia — sem erros de compilacao TypeScript)

```bash
cd /home/tsgomes/mcad/services/bff && npm test
```

Resultado: sucesso

```
tests 128
pass  128
fail  0
duration_ms 1290.747
```

## 3. Resultado da revisao tecnica

Status: APROVADA

### Arquivos inspecionados

- `services/bff/src/authzPermissionLifecycleRoutes.ts` (novo)
- `services/bff/src/authzPermissionLifecycleRoutes.test.ts` (novo)
- `services/bff/src/server.ts` (modificado)
- `services/bff/src/authzPermissionLifecycleContract.ts` (pre-existente, gerado pela task 1.0)
- `tasks/prd-gestao-ciclo-vida-permissoes/2_task.md`
- `tasks/prd-gestao-ciclo-vida-permissoes/prd.md`
- `tasks/prd-gestao-ciclo-vida-permissoes/techspec.md`
- `tasks/prd-gestao-ciclo-vida-permissoes/authz-contract.md`
- `tasks/prd-gestao-ciclo-vida-permissoes/authz-api-solicitacao.md`

### Criterios de sucesso da task (2.0)

| Criterio | Status |
| --- | --- |
| BFF expoe `GET /api/autorizacao/permissoes/:id/papeis-vinculados` | ATENDIDO |
| Resposta lista corretamente os papeis vinculados ativos | ATENDIDO |
| `canRemove` e `blockingReason` refletem corretamente status e vinculacao | ATENDIDO |
| Testes cobrem permissao sem vinculos, com vinculos e com status nao depreciado | ATENDIDO |

### Subtarefas concluidas

| Subtarefa | Status |
| --- | --- |
| 2.1 Criar modulo de rotas/utilitarios | ATENDIDO |
| 2.2 Fetch detalhe da permissao via `GET /v1/permissions/{id}` | ATENDIDO |
| 2.3 Fetch catalogo de papeis via `GET /v1/roles` | ATENDIDO |
| 2.4 Fan-out para `GET /v1/roles/{roleId}/permissions` e filtragem | ATENDIDO |
| 2.5 Montar `PermissionRemovalEligibility` com `linkedRoles`, `canRemove`, `blockingReason` | ATENDIDO |
| 2.6 Apenas papeis `ACTIVE` entram no bloqueio de remocao | ATENDIDO |
| 2.7 Mapear erros 401/403/404/503 em envelope consistente | ATENDIDO |
| 2.8 Cobrir endpoint com testes no padrao do BFF | ATENDIDO |

### Conformidade com PRD e TechSpec

- Estrategia de fan-out segue exatamente o descrito na TechSpec: `page=0&size=200&sort=displayName,asc`.
- Shape do `PermissionRemovalEligibility` corresponde ao modelo de dados da TechSpec (`linkedRoles`, `canRemove`, `blockingReason?`).
- Phase 2 stubs retornam `501` com `AUTHZ_PERMISSION_OPERATION_UNAVAILABLE` conforme contrato local definido em `authz-contract.md`.
- Bearer do usuario e reaproveitado via `ctx.token`; autorizacao server-side via `VIEW_PERMISSION = 'authz:admin:permission:visualizar'`.
- `x-correlation-id` e propagado para todas as chamadas ao `ecad-authz` usando `toUuidCorrelationId`.
- Rota registrada antes dos proxies em `server.ts`, seguindo o padrao estabelecido.

### Qualidade dos testes (13 novos)

| Cenario | Cobertura |
| --- | --- |
| Sem `Authorization` header → 401 | COBERTO |
| Sem permissao de visualizacao → 403 | COBERTO |
| Permissao nao encontrada → 404 | COBERTO |
| Upstream falha no detalhe da permissao → 503 | COBERTO |
| `DEPRECATED` com apenas papel `INACTIVE` → `canRemove=true`, `linkedRoles=[1]` | COBERTO |
| `DEPRECATED` sem papeis vinculados → `canRemove=true`, `linkedRoles=[]` | COBERTO |
| `ACTIVE` → `blockingReason=STATUS_NOT_DEPRECATED`, `canRemove=false` | COBERTO |
| `DEPRECATED` com papel `ACTIVE` vinculado → `blockingReason=ROLE_LINKS_PRESENT`, `canRemove=false` | COBERTO |
| Fan-out falha → 503 | COBERTO |
| POST `/permissoes` sem auth → 401 | COBERTO |
| POST `/permissoes` com auth → 501 `create` | COBERTO |
| POST `/permissoes/:id/reativar` → 501 `reactivate` | COBERTO |
| POST `/permissoes/:id/remover` → 501 `remove` | COBERTO |

### Observacao nao bloqueante

O header `x-authz-version` obtido via `ctx.authzVersionHeader` nao e propagado no response de `GET /papeis-vinculados`. O padrao estabelecido em `acessosRoutes.ts` e `meRoutes.ts` propaga esse header. A TechSpec menciona "propagar x-authz-version" nos pontos de integracao. Para esta task (endpoint de leitura, sem mutacao de estado), o impacto e marginal e o criterio nao esta entre os de sucesso da task 2.0. Registrado como observacao para eventual alinhamento nas tasks futuras.

## 4. Problemas encontrados

Nenhum problema bloqueante. Uma observacao marginal registrada acima (propagacao de `x-authz-version` no response).

## 5. Recomendacao final

APROVADA
