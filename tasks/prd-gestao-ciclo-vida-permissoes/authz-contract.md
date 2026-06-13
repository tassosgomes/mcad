# Contrato local do ciclo de vida de permissoes no MCAD

## Objetivo

Consolidar, no repositorio do MCAD, a leitura oficial do contrato final do `ecad-authz` para a feature `gestao-ciclo-vida-permissoes`, ativando o ciclo completo de criacao, depreciacao, reativacao, consulta de vinculos e remocao logica.

Artefatos em codigo:

- `frontend/src/features/authz/contract/authzPermissionLifecycleContract.ts`
- `services/bff/src/authzPermissionLifecycleContract.ts`

## Leitura contratual oficial

Contrato final confirmado no upstream:

- `PermissionStatus = ACTIVE | DEPRECATED | DISABLED`
- `POST /v1/permissions`
- `GET /v1/permissions`
- `GET /v1/permissions/{permissionId}`
- `GET /v1/permissions/{permissionId}/roles`
- `PATCH /v1/permissions/{permissionId}/deprecate`
- `POST /v1/permissions/{permissionId}/reactivate`
- `POST /v1/permissions/{permissionId}/remove`

Decisao local do MCAD:

- manter `DISABLED` como estado tecnico oficial;
- apresentar `DISABLED` ao usuario com o rotulo de negocio `Removida`;
- usar o BFF como wrapper governado e auditavel para todas as mutacoes;
- usar `GET /v1/permissions/{permissionId}/roles` como fonte oficial de impedimentos de remocao.

## Capability matrix local

| Capability | Valor | Observacao |
| --- | --- | --- |
| `canCreate` | `true` | `POST /v1/permissions` disponivel |
| `canDeprecate` | `true` | `PATCH /v1/permissions/{permissionId}/deprecate` disponivel |
| `canListLinkedRoles` | `true` | `GET /v1/permissions/{permissionId}/roles` disponivel |
| `canReactivate` | `true` | `POST /v1/permissions/{permissionId}/reactivate` disponivel |
| `canRemove` | `true` | `POST /v1/permissions/{permissionId}/remove` disponivel |

## Mapeamento de status

| Status tecnico | Rotulo de negocio na UX |
| --- | --- |
| `ACTIVE` | `Ativa` |
| `DEPRECATED` | `Depreciada` |
| `DISABLED` | `Removida` |

Observacao:

- `DISABLED` e o equivalente local do estado final de remocao logica pedido pelo PRD.

## Mutacoes governadas

- `POST /api/autorizacao/permissoes` valida payload localmente e encaminha para `POST /v1/permissions`.
- `POST /api/autorizacao/permissoes/:id/depreciar` preserva a deprecacao governada existente.
- `POST /api/autorizacao/permissoes/:id/reativar` encaminha para `POST /v1/permissions/{permissionId}/reactivate`.
- `POST /api/autorizacao/permissoes/:id/remover` exige `confirmationText == CONFIRMO`, valida status depreciado e consulta papeis ativos em `GET /v1/permissions/{permissionId}/roles` antes de encaminhar para `POST /v1/permissions/{permissionId}/remove`.

## Erros finais relevantes

- `INVALID_CONFIRMATION`
- `PERMISSION_IN_USE`
- `INVALID_PERMISSION_STATUS_TRANSITION`
- `PERMISSION_KEY_ALREADY_EXISTS`
- `PERMISSION_KEY_OWNED_BY_ANOTHER_SERVICE`
- `INVALID_PERMISSION_NAMESPACE`
- `MISSING_PERMISSION`
- `AUTHZ_SERVICE_UNAVAILABLE`

## Impacto pratico

- Frontend deve exibir cadastro, reativacao e remocao conforme status/elegibilidade.
- Remocao exige entrada literal `CONFIRMO` na UX e no BFF.
- Qualquer copy de UX deve tratar `DISABLED` como `Removida`, sem renomear o enum tecnico do contrato.
