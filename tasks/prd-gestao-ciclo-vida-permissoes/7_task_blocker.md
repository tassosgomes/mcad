# Registro de desbloqueio da Task 7.0

## Status

Desbloqueada em 2026-06-13 pelo contrato OpenAPI final fornecido pelo usuario nesta rodada.

## Contrato final considerado fonte de verdade

- OpenAPI 3.1.0, base AuthZ `/v1`.
- `POST /permissions` cria permissao administrativa com ownership `ecad-authz-service`, status inicial `ACTIVE` e requer `authz:admin:permission:criar`.
- `GET /permissions/{permissionId}/roles` retorna `RolePage` paginado com papeis `ACTIVE` vinculados e passa a ser a fonte oficial para impedimentos de remocao logica.
- `PATCH /permissions/{permissionId}/deprecate` mantem `ACTIVE -> DEPRECATED`.
- `POST /permissions/{permissionId}/reactivate` aplica `DEPRECATED -> ACTIVE`.
- `POST /permissions/{permissionId}/remove` exige `PermissionRemoveRequest { confirmationText }`, `confirmationText == CONFIRMO`, status `DEPRECATED` e ausencia de papeis `ACTIVE`, aplicando `DEPRECATED -> DISABLED`.
- `PermissionStatus = ACTIVE | DEPRECATED | DISABLED`.

## Decisao de implementacao atualizada

- Ativar capabilities locais:
  - `canCreate: true`
  - `canReactivate: true`
  - `canRemove: true`
- Remover stubs `501` do BFF para create/reactivate/remove.
- Usar o BFF como wrapper governado e auditavel para as mutacoes.
- Preservar `DISABLED` como estado tecnico e rotulo de negocio `Removida`.
