# Evidências de Entrega — Gestão do Ciclo de Vida de Permissões

Data de fechamento: 2026-06-13

---

## Resumo da Entrega

O PRD `gestao-ciclo-vida-permissoes` foi entregue integralmente. O plano original dividia a entrega em duas fases porque o `ecad-authz` ainda não expunha os endpoints administrativos de create/reactivate/remove. Em 2026-06-13 o upstream publicou o contrato final, o MCAD absorveu a evolução contratual (Task 7.0) e todas as capabilities foram ativadas sem mudança de arquitetura. A Fase 2 foi absorvida pela Fase 1.

---

## Contrato Final Ativo

Fonte: `authz-contract.md`

| Capability | Status |
| --- | --- |
| `canCreate` | `true` — `POST /v1/permissions` |
| `canDeprecate` | `true` — `PATCH /v1/permissions/{id}/deprecate` |
| `canListLinkedRoles` | `true` — `GET /v1/permissions/{id}/roles` |
| `canReactivate` | `true` — `POST /v1/permissions/{id}/reactivate` |
| `canRemove` | `true` — `POST /v1/permissions/{id}/remove` |

Mapeamento de status: `ACTIVE → Ativa`, `DEPRECATED → Depreciada`, `DISABLED → Removida`.

---

## Artefatos de Código

| Componente | Arquivo | Responsabilidade |
| --- | --- | --- |
| Contrato frontend | `frontend/src/features/authz/contract/authzPermissionLifecycleContract.ts` | Capability matrix, labels, guards |
| Contrato BFF | `services/bff/src/authzPermissionLifecycleContract.ts` | Espelho tipado para o BFF |
| API frontend | `frontend/src/features/authz/api/authzPermissionLifecycleApi.ts` | Clientes HTTP para as rotas BFF |
| Rotas BFF | `services/bff/src/authzPermissionLifecycleRoutes.ts` | Wrappers governados + auditoria |
| Hooks | `frontend/src/features/authz/hooks/usePermissionLifecycle.ts` | React Query mutations e queries |
| Listagem | `frontend/src/features/authz/pages/PermissionsPage.tsx` | Filtros, CTA cadastro, badges |
| Detalhe | `frontend/src/features/authz/pages/PermissionDetailPage.tsx` | Modais de ação, vinculação, remoção |
| Painéis | `frontend/src/features/authz/pages/PermissionDetailPanels.tsx` | Metadados, papéis vinculados, ações |

---

## Evidências de Testes Automatizados

Data: 2026-06-13

### BFF

Comando: `cd services/bff && npm test`

```
tests  142
pass   142
fail   0
```

Cobertura das rotas de ciclo de vida (`authzPermissionLifecycleRoutes.test.ts`):
- `GET /api/autorizacao/permissoes/:id/papeis-vinculados` — 200, 401, 403, 404, 503; cálculo de elegibilidade; bloqueio por ROLE_LINKS_PRESENT e STATUS_NOT_DEPRECATED.
- `POST /api/autorizacao/permissoes/:id/depreciar` — 200, 401, 403, 422; auditoria SUCCESS e FAILURE.
- `POST /api/autorizacao/permissoes` — 201, 401, 403, 409, 422; validação de chave; auditoria.
- `POST /api/autorizacao/permissoes/:id/reativar` — 200, 401, 403, 422; auditoria.
- `POST /api/autorizacao/permissoes/:id/remover` — 200, 400 INVALID_CONFIRMATION, 409 PERMISSION_IN_USE, 422 INVALID_PERMISSION_STATUS_TRANSITION; auditoria SUCCESS e FAILURE.

Contrato (`authzPermissionLifecycleContract.test.ts`): capability matrix, labels de status, builder de erro 501 para retrocompatibilidade defensiva.

### Frontend

Comando: `cd frontend && npm run test`

```
Test Files  38 passed (38)
Tests       151 passed (151)
```

Cobertura de authz lifecycle:
- `authzPermissionLifecycleApi.test.ts` — getPermissionLinkedRoles, deprecatePermissionGoverned, createPermission, reactivatePermission, removePermission.
- `authzPermissionLifecycleContract.test.ts` — capability matrix final, mapeamento DISABLED → Removida, type guard de erro.
- `usePermissionLifecycle.test.tsx` — hooks de mutação e consulta.
- `PermissionsPage.test.tsx` — CTA de cadastro, filtros de status, badges.
- `PermissionDetailPage.test.tsx` — ações condicionais por status, modal CONFIRMO, bloqueio por papéis.
- `permission.test.ts` — tipos e CreatePermissionInput.

---

## Rollout

### O que está em produção agora

- Listagem de permissões com filtros de status (ACTIVE, DEPRECATED, DISABLED/Removida).
- Detalhe com metadados, papéis vinculados e elegibilidade de remoção.
- Depreciação auditada (`ACTIVE → DEPRECATED`).
- Reativação auditada (`DEPRECATED → ACTIVE`).
- Cadastro de nova permissão com validação de namespace.
- Remoção lógica governada com confirmação `CONFIRMO` (`DEPRECATED → DISABLED`).
- Trilha de auditoria completa via `ecad-auditoria` para todas as mutações.

### O que não foi entregue (fora de escopo confirmado)

Estes itens estão explicitamente listados como não-objetivos no PRD e não fazem parte desta entrega:

- Edição da chave de uma permissão existente.
- Operações em lote (criação, depreciação, remoção múltipla).
- Versionamento automático de permissões.
- Migração automática de papéis impactados por mudança de catálogo.
- Exclusão física de registros históricos.

### Fase 2 — Situação

A Fase 2 foi fechada em 2026-06-13. O `ecad-authz` entregou os endpoints administrativos faltantes e a Task 7.0 ativou os fluxos remanescentes. Não há Fase 2 pendente. Qualquer evolução futura (ex: operações em lote, edição de chave) deve abrir um novo PRD.

---

## Validação do Fluxo Completo (Task 8.6)

O fluxo completo do PRD foi implementado e validado automaticamente:

```
cadastro (ACTIVE)
    ↓ Depreciar
depreciação (DEPRECATED)
    ↓ Reativar            ↓ Remover (sem vínculos + CONFIRMO)
ativa (ACTIVE)        removida (DISABLED)
```

Validações de bloqueio implementadas e cobertas por testes:
- Depreciação bloqueada se já DEPRECATED ou DISABLED.
- Reativação bloqueada se não estiver DEPRECATED.
- Remoção bloqueada por: status != DEPRECATED, confirmationText != CONFIRMO, papéis ACTIVE vinculados.
- Permissão DISABLED é estado final: não expõe ações de reativação na UI.

Para validação manual completa, consultar `qa-checklist.md`.

---

## Referências

- PRD: `tasks/prd-gestao-ciclo-vida-permissoes/prd.md`
- Tech Spec: `tasks/prd-gestao-ciclo-vida-permissoes/techspec.md`
- Contrato local: `tasks/prd-gestao-ciclo-vida-permissoes/authz-contract.md`
- Solicitação upstream (atendida): `tasks/prd-gestao-ciclo-vida-permissoes/authz-api-solicitacao.md`
- Checklist manual: `tasks/prd-gestao-ciclo-vida-permissoes/qa-checklist.md`
