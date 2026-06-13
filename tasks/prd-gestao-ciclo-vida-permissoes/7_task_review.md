# Review — Task 7.0: Ativar fluxos de criar, reativar e remover

## Resultado: APROVADA

---

## 1. Validação Automatizada

| Comando | Resultado |
|---|---|
| `npm test` (BFF) | ✅ 142/142 testes passaram |
| `npm run build` (frontend) | ✅ Build limpo sem erros |
| `npm run test` (frontend) | ✅ 151/151 testes passaram |
| `npm run test:authz-lifecycle` (frontend) | ✅ 43/43 testes passaram |

---

## 2. Revisão Técnica por Subtarefa

### 7.1 — Confirmar OpenAPI do `ecad-authz` ✅

Endpoints confirmados no contrato (`api-contract.yaml`):
- `POST /permissions` — cria com `authz:admin:permission:criar`, status inicial `ACTIVE`
- `POST /permissions/{permissionId}/reactivate` — reativa `DEPRECATED → ACTIVE`
- `POST /permissions/{permissionId}/remove` — remove com `confirmationText == CONFIRMO`, `DEPRECATED → DISABLED`
- `GET /permissions/{permissionId}/roles` — fonte oficial de papéis vinculados

### 7.2 — Cliente API e BFF atualizados ✅

- `authzPermissionLifecycleApi.ts`: funções `createPermission`, `reactivatePermission`, `removePermission` chamam rotas BFF reais.
- BFF (`authzPermissionLifecycleRoutes.ts`): rotas `POST /api/autorizacao/permissoes`, `POST /:id/reativar`, `POST /:id/remover` chamam upstream ecad-authz sem stubs 501.
- Contrato BFF/frontend: `AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES` com `canCreate`, `canReactivate`, `canRemove` = `true`. `PHASE_2` vazia (tudo em `PHASE_1`).

### 7.3 — Formulário de cadastro ✅

`PermissionCreatePage.tsx`:
- Campos: domínio, área, recurso, ação, nome de exibição, descrição.
- Geração automática da chave `dominio:area:recurso:acao` via `normalizeSegment` (lowercase, NFD, remoção de acentos, só alfanumérico e hífen).
- Validação client-side: rejeita submit se segmentos obrigatórios ou displayName vazios.
- Navegação para detalhe da permissão criada após sucesso.
- Rota registrada em `index.tsx` em `/autorizacao/permissoes/nova`.

### 7.4 — Reativação no detalhe ✅

`PermissionDetailPage.tsx`:
- Botão "Reativar" condicional: `canReactivatePermission && permission.status === 'DEPRECATED'`.
- `ConfirmModal` antes da ação.
- Toast de sucesso/erro.
- Cache invalidado: permissionsQueryKey, permission detail, linkedRolesQueryKey.

### 7.5 — Remoção com confirmação CONFIRMO ✅

`PermissionDetailPage.tsx`:
- Botão "Remover" só habilitado quando `canRemovePermission && status === 'DEPRECATED' && eligibility.canRemove === true`.
- Modal customizado com campo de texto; botão de confirmação desabilitado até `removeConfirmationText === 'CONFIRMO'`.
- Não fecha o modal se a mutation está pendente.

### 7.6 — Tratamento de erros ✅

BFF cobre:
- `INVALID_CONFIRMATION` (400): confirmationText != 'CONFIRMO', com evento de auditoria de FAILURE.
- `PERMISSION_IN_USE` (409): papéis ACTIVE vinculados, validado antes de chamar upstream.
- `INVALID_PERMISSION_STATUS_TRANSITION` (422): status != DEPRECATED antes da remoção.
- `409 PERMISSION_KEY_ALREADY_EXISTS`: forwarded do upstream para criação.
- `503 AUTHZ_SERVICE_UNAVAILABLE`: upstream 5xx mapeado.

### 7.7 — Testes atualizados ✅

**BFF** (`authzPermissionLifecycleRoutes.test.ts`, `authzPermissionLifecycleContract.test.ts`):
- Cobrem: 401/403, success path, error paths (404, 409, 422, 503), audit events (SUCCESS e FAILURE), headers propagados.

**Frontend** (`authzPermissionLifecycleApi.test.ts`, `usePermissionLifecycle.test.tsx`, `PermissionCreatePage.test.tsx`, `PermissionDetailPage.test.tsx`, `PermissionsPage.test.tsx`, `authzPermissionLifecycleContract.test.ts`):
- Cobrem: capability matrix, criação com key preview e validação, reativação com modal, remoção com CONFIRMO obrigatório, bloqueio por papéis ativos, estado DISABLED → Removida, CTA de cadastro gated por capability.

---

## 3. Verificações Adicionais

- **Auditoria**: todos os BFF mutations publicam evento `PERMISSION_LIFECYCLE` com `action`, `outcome`, `actor.subject`, `permissionId`, `permissionKey`, `correlationId`.
- **Routing**: rota `/autorizacao/permissoes/nova` registrada com `RequirePermission`.
- **Status DISABLED**: mapeado para label "Removida" no contrato e nos filtros da listagem.
- **ADR compliance**: ADR 0001 (ecad-authz como fonte autoritativa), ADR 0002 (formato de chave validado), ADR 0003 (frontend só UX), ADR 0004 (BFF/proxy oficial), ADR 0008 (BFF para cross-cutting).
- **Sem novas dependências** de biblioteca introduzidas.
- **Sem stubs 501** no BFF — todas as rotas chamam o upstream real.

---

## Recomendação Final

**APROVADA** — Task 7.0 totalmente implementada e validada. Todos os subtarefas concluídas, testes cobrindo fluxos felizes e de erro, sem regressões.
