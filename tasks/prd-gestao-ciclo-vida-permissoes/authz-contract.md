# Contrato local do ciclo de vida de permissoes no MCAD

## Objetivo

Consolidar, no repositorio do MCAD, a leitura oficial do contrato atual do `ecad-authz` para a feature `gestao-ciclo-vida-permissoes`, mantendo o frontend e o BFF em modo fail-closed.

Artefatos em codigo:

- `frontend/src/features/authz/contract/authzPermissionLifecycleContract.ts`
- `services/bff/src/authzPermissionLifecycleContract.ts`

## Leitura contratual oficial

Contrato confirmado hoje no upstream:

- `PermissionStatus = ACTIVE | DEPRECATED | DISABLED`
- `GET /v1/permissions`
- `GET /v1/permissions/{permissionId}`
- `PATCH /v1/permissions/{permissionId}/deprecate`
- `GET /v1/roles`
- `GET /v1/roles/{roleId}/permissions`

Contrato ausente hoje no upstream:

- `POST /v1/permissions`
- `POST /v1/permissions/{permissionId}/reactivate`
- `POST /v1/permissions/{permissionId}/remove`
- `GET /v1/permissions/{permissionId}/roles`

Decisao local do MCAD:

- manter `DISABLED` como estado tecnico oficial;
- apresentar `DISABLED` ao usuario com o rotulo de negocio `Removida`;
- nao simular `create`, `reactivate` ou `remove` localmente enquanto o upstream nao expuser endpoints administrativos proprios.

## Capability matrix local

| Capability | Valor | Observacao |
| --- | --- | --- |
| `canDeprecate` | `true` | Endpoint upstream existente |
| `canListLinkedRoles` | `true` | Implementavel por agregacao local no BFF |
| `canCreate` | `false` | Depende de `POST /v1/permissions` |
| `canReactivate` | `false` | Depende de `POST /v1/permissions/{permissionId}/reactivate` |
| `canRemove` | `false` | Depende de `POST /v1/permissions/{permissionId}/remove` |

## Mapeamento de status

| Status tecnico | Rotulo de negocio na UX |
| --- | --- |
| `ACTIVE` | `Ativa` |
| `DEPRECATED` | `Depreciada` |
| `DISABLED` | `Removida` |

Observacao:

- `DISABLED` e o equivalente local do estado final de remocao logica pedido pelo PRD.

## Erro local para operacao indisponivel

Quando o frontend chamar uma rota governada do BFF para uma operacao ainda indisponivel por ausencia de endpoint no `ecad-authz`, o shape local padrao deve ser:

- HTTP status: `501`
- body:

```json
{
  "code": "AUTHZ_PERMISSION_OPERATION_UNAVAILABLE",
  "message": "Operacao indisponivel no momento: o ecad-authz ainda nao expoe POST /v1/permissions/{permissionId}/remove.",
  "operation": "remove",
  "upstream": "ecad-authz",
  "missingEndpoint": "POST /v1/permissions/{permissionId}/remove",
  "phase": "PHASE_2"
}
```

Regras:

- `operation` varia entre `create`, `reactivate` e `remove`;
- `missingEndpoint` deve apontar o endpoint administrativo ausente no upstream;
- `phase` permanece `PHASE_2` enquanto a dependencia externa nao existir.

## Fase 1 x Fase 2

### Fase 1

Escopo implementavel com o contrato atual do upstream:

- listar permissoes;
- consultar detalhe de permissao;
- depreciar permissao;
- levantar papeis vinculados por agregacao local no BFF;
- tratar `DISABLED` como `Removida` na camada de apresentacao.

### Fase 2

Escopo bloqueado por evolucao do `ecad-authz`:

- criar permissao;
- reativar permissao depreciada;
- remover logicamente uma permissao;
- consultar papeis vinculados por endpoint oficial dedicado.

## Impacto pratico para as proximas tasks

- Frontend deve esconder ou desabilitar acoes de `create`, `reactivate` e `remove` com base na capability matrix local.
- BFF deve responder com o erro local padrao se uma rota de Fase 2 existir antes do endpoint correspondente no upstream.
- Qualquer copy de UX deve tratar `DISABLED` como `Removida`, sem renomear o enum tecnico do contrato.
