# Logto roles -> ecad-authz assignments migration report

- mode: dry-run
- correlationId: authz-migration-example
- startedAt: 2026-05-29T00:00:00.000Z
- finishedAt: 2026-05-29T00:00:02.000Z
- usersScanned: 3
- rolesRecognized: 2
- rolesUnmapped: 1
- usersWithoutRole: 1
- assignmentsPlanned: 2
- assignmentsCreated: 0
- assignmentsAlreadyExisting: 0
- assignmentsFailed: 0
- validationUsers: 2
- blockingFindings: 1

## Blocking findings

- UNMAPPED_LOGTO_ROLE: Logto role 'legacy-sem-mapeamento' has no official mapping in seeds/mcad/roles.json

## Unmapped roles

- legacy-sem-mapeamento for username=usuario_legacy email=us***@mcad.local

## Planned assignments

| user | sourceRole | roleKey |
|---|---|---|
| username=analista_cadastro email=an***@mcad.local | analista-cadastro | cadastro.default.analista |
| username=gerente_dev email=ge***@mcad.local | gerente-distribuicao | distribuicao.default.gerente |

## Validation users

| user | status | plannedRoles | beforePermissions | afterPermissions |
|---|---|---:|---:|---:|
| hint=analista.dev username=analista_distribuicao email=an***@mcad.local | planned | 1 | n/a | n/a |
| hint=sem-papel.dev username=sem_papel email=se***@mcad.local | missing-from-logto-export | 0 | n/a | n/a |

## Rollback procedure

1. Keep this report and the original Logto export as immutable evidence.
2. If apply was executed, remove only assignments listed here as created in this run.
3. Re-run this script with --dry-run and confirm blockingFindings returns to zero before another apply.
4. Do not recreate Logto roles as an authorization source; use ecad-authz official assignment APIs.

