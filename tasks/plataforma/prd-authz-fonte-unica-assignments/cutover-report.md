# Cutover report - ecad-authz como fonte unica de assignments

> Data local da execucao parcial: 2026-05-29
> Executor: AI Flow worker subagent
> Escopo: task 8.0, somente implementacao/execucao local sem credenciais live
> Resultado: **nao aprovado para cutover live ainda**; aguardando gates de ambiente com Logto, ecad-authz, BFF, frontend, Auditoria e usuarios `.env_qa`.

## Sumario executivo

Esta execucao completou os gates locais e documentais possiveis para a task 8.0. As tasks 1.0 a 7.0 estao marcadas como concluidas em `tasks.md`, os reviews das tasks anteriores registram aprovacao, os scripts de migracao/provisionamento/seed passaram em validacoes locais, e as suites Node/React aplicaveis passaram.

Nao houve execucao de cutover live. As etapas que dependem de credenciais, tenant Logto, ecad-authz alvo, BFF/frontend implantados, Auditoria e usuarios reais da `.env_qa` estao registradas como gate pendente. Nenhuma evidencia live foi fabricada.

## Estado das dependencias

| Item | Status local | Evidencia |
|---|---|---|
| Task 1.0 | Concluida | `tasks.md` marca `[x]`; review aprovado em `1.0_task_review.md`. |
| Task 2.0 | Concluida | `tasks.md` marca `[x]`; review aprovado em `2.0_task_review.md`. |
| Task 3.0 | Concluida | `tasks.md` marca `[x]`; review aprovado em `3.0_task_review.md`. |
| Task 4.0 | Concluida | `tasks.md` marca `[x]`; review aprovado em `4.0_task_review.md`. |
| Task 5.0 | Concluida | `tasks.md` marca `[x]`; review aprovado em `5.0_task_review.md`. |
| Task 6.0 | Concluida | `tasks.md` marca `[x]`; review aprovado em `6.0_task_review.md`. |
| Task 7.0 | Concluida | `tasks.md` marca `[x]`; review aprovado em `7.0_task_review.md`. |
| Deploy no ambiente alvo | Pendente | Nao validado nesta execucao por ausencia de servicos/credenciais live. |

## Evidencias locais executadas

| Comando | Resultado |
|---|---|
| `rtk bash -n scripts/provision-logto.sh` | Passou. |
| `rtk bash -n scripts/seed-authz.sh` | Passou. |
| `rtk node --check scripts/migrate-logto-roles-to-authz-assignments.mjs` | Passou. |
| `rtk node --check scripts/migrate-logto-roles-to-authz-assignments.test.mjs` | Passou. |
| `rtk bash scripts/provision-logto.sh --check-no-business-roles` | Passou; confirmou ausencia de chamadas ativas para roles/user roles e criacao/atualizacao de JWT customizer. |
| `rtk jq empty seeds/mcad/roles.json seeds/mcad/assignments.json` | Passou. |
| `rtk jq` de schema minimo de `seeds/mcad/assignments.json` | Passou. |
| `rtk jq` conferindo que assignments usam roles conhecidas em `seeds/mcad/roles.json` | Passou. |
| `rtk jq` conferindo pelo menos um usuario sem role em fixture DEV/CI | Passou. |
| `rtk jq` conferindo emails unicos em assignments | Passou. |
| `rtk node --test scripts/migrate-logto-roles-to-authz-assignments.test.mjs` | Passou: 1 teste. |
| `rtk bash scripts/seed-authz.sh --dry-run` | Passou; dry-run percorreu catalogos, roles e assignments sem escrita. |
| `rtk node scripts/migrate-logto-roles-to-authz-assignments.mjs --dry-run --logto-export tests/fixtures/migrate-logto-roles-to-authz-assignments/known-role.json --env-qa /tmp/mcad-validation-env-qa-missing --report /tmp/mcad-task8-migrate-known-report.md --correlation-id task8-known` | Passou; `blockingFindings=0`, `assignmentsPlanned=1`. |
| `rtk node scripts/migrate-logto-roles-to-authz-assignments.mjs --dry-run --logto-export tests/fixtures/migrate-logto-roles-to-authz-assignments/unknown-role.json --env-qa /tmp/mcad-validation-env-qa-missing --report /tmp/mcad-task8-migrate-unknown-report.md --correlation-id task8-unknown` | Retornou codigo 3 esperado; `blockingFindings=1` por role sem mapeamento. |
| `rtk node scripts/migrate-logto-roles-to-authz-assignments.mjs --dry-run --logto-export tests/fixtures/migrate-logto-roles-to-authz-assignments/duplicate-assignment.json --env-qa /tmp/mcad-validation-env-qa-missing --report /tmp/mcad-task8-migrate-duplicate-report.md --correlation-id task8-duplicate` | Passou; `blockingFindings=0`, plano idempotente. |
| Parser local de `.env_qa` via `parseEnvQaUsers` | Passou; leu 7 usuarios e o payload serializado nao reteve texto de senha/password. |
| `rtk npm run build` em `services/identity-sync-api` | Passou. |
| `rtk npm test` em `services/identity-sync-api` | Passou: 1 teste. |
| `rtk npm run build` em `services/bff` | Passou. |
| `rtk npm test` em `services/bff` | Passou: 4 testes. |
| `rtk npm run build` em `services/ai-orchestrator` | Passou. |
| `rtk npm test` em `services/ai-orchestrator` | Passou: 7 testes. |
| `rtk npm test` em `frontend` | Passou: 21 arquivos, 80 testes. |
| `rtk npm run build` em `frontend` | Passou; Vite manteve o aviso conhecido de `/runtime-env.js` sem `type="module"`. |

## Resultado da busca estatica final

| Busca | Resultado / excecoes |
|---|---|
| Tasks 1.0 a 7.0 marcadas completas | Confirmado em `tasks.md`. |
| `hasRole(`, `RequireRole`, `x-mcad-roles`, `realm_access`, `resource_access`, customizer `roles`, scope `roles` | Nenhum uso funcional encontrado. Excecoes: BFF remove `x-mcad-roles` enviado pelo cliente; testes comprovam remocao; `acessosRoutes.ts` usa `roles` como assignments oficiais retornados pelo ecad-authz. |
| `assertPermission`, `requireToolPermission`, `permissions.includes`, `roles`, `scope`, `admin`, `super-admin`, `write`, claims no AI/BFF | `assertPermission` no `ai-orchestrator` usa somente `permissions` efetivas e wildcard; BFF usa `roles` somente em payloads oficiais de assignments/perfil efetivo; `scope` em BFF aparece como campo opcional de assignment/dominio, nao como scope JWT que concede permissao. |
| Scripts e identity-sync com `/roles`, `roleKeys`, `roles`, `jwt-customizer` | `provision-logto.sh` contem guardas contra roles e apenas `DELETE /configs/jwt-customizer/access-token`; `seed-authz.sh` usa endpoints oficiais do ecad-authz `/roles` e `/users/{id}/roles`; migracao le roles do Logto somente para backfill controlado e escreve via ecad-authz; `identity-sync-api` preserva teste/normalizacao de campos legados removidos do evento publicado. |
| Frontend com acesso direto ao `ecad-authz` | A feature operacional `frontend/src/features/autorizacao` usa BFF. Excecao existente: `frontend/src/features/authz/*` ainda usa `apiAuthzClient` para admin tecnico de catalogo, fora do fluxo operacional comum de Atribuicoes. |
| SLA de cache e invalidacao | BFF limita `ME_CACHE_TTL_SECONDS <= 300`; frontend usa `staleTime=60_000`, `gcTime=300_000` e invalida queries de permissoes/assignments/historico apos atribuir/remover. |

## Gates live pendentes

Estas etapas precisam ser executadas no ambiente alvo antes de aprovar o cutover. Substitua variaveis por valores do ambiente sem registrar segredos em terminal compartilhado, tickets ou relatorios.

### 1. Confirmar deploy das tasks 1.0-7.0

```bash
rtk rg -n "^- \\[x\\] [1-7]\\.0" tasks/plataforma/prd-authz-fonte-unica-assignments/tasks.md
rtk curl -sS "$BFF_BASE_URL/health/ready"
rtk curl -sS "$AI_ORCHESTRATOR_BASE_URL/health/ready"
rtk curl -sS "$AUTHZ_BASE_URL/actuator/health"
```

Gate: todos os health checks devem retornar saudavel e as versoes implantadas devem conter as mudancas aprovadas nas tasks 1.0-7.0.

### 2. Executar migracao dry-run com export real do Logto

```bash
rtk node scripts/migrate-logto-roles-to-authz-assignments.mjs --dry-run \
  --logto-export "$LOGTO_ROLES_EXPORT" \
  --env-qa .env_qa \
  --report tasks/plataforma/prd-authz-fonte-unica-assignments/migration-report-dry-run.md \
  --correlation-id "authz-cutover-dry-run-YYYYMMDDHHMM"
```

Gate: `blockingFindings=0`, `rolesUnmapped=0`, usuarios da `.env_qa` presentes ou justificados, e relatorio revisado por plataforma.

### 3. Executar migracao apply com ator tecnico `migration`

```bash
rtk node scripts/migrate-logto-roles-to-authz-assignments.mjs --apply \
  --logto-export "$LOGTO_ROLES_EXPORT" \
  --env-qa .env_qa \
  --report tasks/plataforma/prd-authz-fonte-unica-assignments/migration-report-apply.md \
  --correlation-id "authz-cutover-apply-YYYYMMDDHHMM"
```

Gate: `assignmentsFailed=0`; nao houve perda de permissoes esperadas para os usuarios de validacao; relatorio preservado como evidencia imutavel.

### 4. Provisionar Logto auth-only e remover customizer legado

```bash
ENV_FILE=.env rtk bash scripts/provision-logto.sh
rtk bash scripts/provision-logto.sh --check-no-business-roles
```

Gate: tenant Logto sem roles de negocio operacionais, sem atribuicao de roles a usuarios e sem JWT customizer que injete `roles` no access token.

### 5. Aplicar fixtures DEV/CI quando aplicavel

```bash
AUTHZ_BASE_URL="$AUTHZ_BASE_URL" AUTHZ_ADMIN_TOKEN="$AUTHZ_ADMIN_TOKEN" rtk bash scripts/seed-authz.sh
```

Gate: somente ambientes DEV/CI devem receber fixtures; producao deve usar assignments reais migrados ou operados pela tela de Atribuicoes.

### 6. Validar access token sem roles e sem scope `roles`

Obtenha token por login real OIDC dos usuarios `.env_qa` e valide localmente sem imprimir o token:

```bash
ACCESS_TOKEN="$ACCESS_TOKEN" rtk node -e 'const token=process.env.ACCESS_TOKEN; if(!token) throw new Error("ACCESS_TOKEN ausente"); const payload=JSON.parse(Buffer.from(token.split(".")[1],"base64url")); const scopes=String(payload.scope ?? "").split(/\s+/).filter(Boolean); const hasRoles=Object.prototype.hasOwnProperty.call(payload,"roles") || Object.prototype.hasOwnProperty.call(payload,"role"); console.log(JSON.stringify({aud:payload.aud, scope:payload.scope ?? null, hasRoles, hasScopeRoles:scopes.includes("roles")}, null, 2)); if (hasRoles || scopes.includes("roles")) process.exit(1);'
rtk curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BFF_BASE_URL/api/me/permissions" -D /tmp/mcad-authz-headers.txt -o /tmp/mcad-authz-permissions.json
```

Gate: `hasRoles=false`, `hasScopeRoles=false`, audience valida e `/api/me/permissions` retorna 200 com `x-authz-version`.

### 7. Validar deny seguro para usuario sem assignment

```bash
rtk curl -sS -o /tmp/mcad-sem-assignment-api.json -w "%{http_code}\n" \
  -H "Authorization: Bearer $SEMPAPEL_TOKEN" \
  "$BFF_BASE_URL/api/acessos/assignments"
```

Gate: API protegida retorna 403; UI nao exibe acoes protegidas para o usuario sem assignment.

### 8. Validar concessao dinamica sem relogin

```bash
START_EPOCH="$(date +%s)"
rtk curl -sS -X POST "$BFF_BASE_URL/api/acessos/papeis/atribuir" \
  -H "Authorization: Bearer $GESTOR_ACESSOS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<target-user-id>","roleKey":"<role-key>"}' \
  -D /tmp/mcad-assign-headers.txt

rtk curl -sS -H "Authorization: Bearer $TARGET_TOKEN" "$BFF_BASE_URL/api/me/permissions" \
  -D /tmp/mcad-target-after-assign-headers.txt \
  -o /tmp/mcad-target-after-assign.json
END_EPOCH="$(date +%s)"
echo "$((END_EPOCH - START_EPOCH))"
```

Gate: permissao aparece sem relogin em ate 300 segundos e `x-authz-version` avanca.

### 9. Validar revogacao em ate 5 minutos

```bash
START_EPOCH="$(date +%s)"
rtk curl -sS -X DELETE "$BFF_BASE_URL/api/acessos/papeis/atribuir/<assignment-id>" \
  -H "Authorization: Bearer $GESTOR_ACESSOS_TOKEN" \
  -D /tmp/mcad-remove-headers.txt

rtk curl -sS -H "Authorization: Bearer $TARGET_TOKEN" "$BFF_BASE_URL/api/me/permissions" \
  -D /tmp/mcad-target-after-remove-headers.txt \
  -o /tmp/mcad-target-after-remove.json
END_EPOCH="$(date +%s)"
echo "$((END_EPOCH - START_EPOCH))"
```

Gate: permissao removida deixa de conceder acesso em ate 300 segundos; API protegida passa a retornar 403 quando a permissao era obrigatoria.

### 10. Conferir observabilidade

Verificar no stack alvo:

- `identity_sync_roles_ignored_total` sem crescimento inesperado apos cutover.
- `authz_identity_role_keys_ignored_total` apenas para eventos legados, sem atribuir roles.
- `bff_acessos_assignment_requests_total{action,outcome}` com sucesso/falha coerentes.
- latencia de assignments e chamadas ao ecad-authz dentro do esperado.
- logs `acessos.papel.atribuir` e `acessos.papel.remover` com actor, target, roleKey, outcome, status e correlationId, sem token/senha.
- falhas de Auditoria retornando `AUDIT_UNAVAILABLE`/503 sem quebrar deny seguro.

## Go/no-go

Cutover live so pode ser aprovado quando todos os gates acima estiverem verdes:

- migracao dry-run real sem bloqueantes;
- migracao apply real sem falhas;
- Logto auth-only confirmado;
- token real sem `roles` e sem scope `roles`;
- usuario sem assignment com 403 e UI sem acoes protegidas;
- concessao e revogacao refletidas sem relogin em ate 5 minutos;
- metricas/logs/auditoria revisados;
- relatorios `migration-report-dry-run.md`, `migration-report-apply.md` e evidencias QA anexados sem segredos.

## Rollback operacional

Rollback nao deve recriar roles de negocio no Logto como fonte de autorizacao. Em caso de problema:

1. Pausar novas atribuicoes na UI/BFF.
2. Preservar relatorios, headers e logs de correlationId.
3. Se o problema veio de assignments criados no apply, remover somente os assignments listados como criados no relatorio da execucao.
4. Reexecutar dry-run ate `blockingFindings=0`.
5. Se houver indisponibilidade do ecad-authz, manter deny seguro e acionar rollback de deploy do componente afetado, sem reativar fallback por role/scope JWT.
6. Revalidar `.env_qa` completa antes de nova tentativa de cutover.

## Decisao desta execucao

**Cutover live nao executado.** Esta task ficou pronta no que e possivel localmente: relatorio, documentacao operacional, dry-runs, builds/testes e buscas estaticas. A aprovacao final depende de uma janela com credenciais e servicos live.
