# Tech Spec — ecad-authz como Fonte Única de Associações Usuário/Perfil

## Resumo Executivo

Esta implementação remove o IdP Logto do fluxo de autorização de negócio. O Logto continuará emitindo identidade OIDC e access token com audience válida, mas roles/scopes de negócio deixarão de ser criados, atribuídos, publicados, lidos ou usados para decisão. O `ecad-authz` passa a ser a única fonte de assignments e permissões efetivas.

A solução é incremental, mas sem feature flag para o comportamento legado: o autoassignment por roles do IdP será removido permanentemente no `ecad-authz`. No MCAD, o BFF continua sendo a fronteira do frontend para gestão de acessos, o `identity-sync-api` passa a publicar somente identidade/status, a tela de Atribuições evolui para operação administrativa auditável, e serviços auxiliares passam a receber/consultar permissões efetivas em vez de confiar em claims do JWT.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **Logto**: autenticação, sessão, usuários de teste e emissão de token OIDC/JWT. Não mantém roles de negócio nem custom claim `roles`.
- **identity-sync-api**: polling da Management API do Logto e publicação de eventos `identity.user.*` no RabbitMQ. O payload publicado deve conter identidade e status; roles não são buscadas nem publicadas.
- **RabbitMQ `identity.events`**: canal de eventos de identidade para o `ecad-authz`. O contrato permanece compatível, mas `user.roles` fica ausente ou vazio.
- **ecad-authz**: upsert de usuários, catálogo de papéis, assignments, contexto de autorização e decisões PDP. Remove `SyncIdentityUserUseCase.assignMappedRoles(...)` e deixa assignment apenas por APIs oficiais.
- **BFF Fastify**: gateway para `/api/me`, `/api/me/permissions`, `/api/acessos/*`, histórico via Auditoria e futuro bridge do `ai-orchestrator`.
- **Frontend React**: OIDC com `oidc-client-ts`; UX baseada em `PermissionsProvider`, `RequirePermission`, `Can` e APIs BFF.
- **Auditoria**: fonte do histórico de atribuições/remoções. O BFF deve consultar/proxar histórico a partir do serviço de Auditoria.
- **ai-orchestrator**: RuntimeContext com permissões efetivas resolvidas pelo BFF ou `ecad-authz`; sem fallback por role/scope do JWT.

Fluxo alvo:

```text
Logto -> identity-sync-api -> RabbitMQ -> ecad-authz upsert user
Gestor -> Frontend -> BFF /api/acessos/* -> ecad-authz assignments -> Auditoria
Frontend -> BFF /api/me/permissions -> ecad-authz authorization-context
APIs/AI -> ecad-authz/BFF permissions -> decisão por permissão efetiva
```

## Design de Implementação

### Interfaces Principais

`identity-sync-api` deve publicar um snapshot sem roles:

```ts
export interface IdentityUserSnapshot {
  logtoUserId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  isSuspended: boolean;
  raw: Record<string, unknown>;
}
```

O `ecad-authz` deve manter o comando aceitando `roleKeys` apenas se necessário para compatibilidade de mensagem antiga, mas sem usá-los para assignment:

```java
public record SyncIdentityUserResult(
    String userId,
    long authzVersion,
    int assignedRoles,
    int ignoredRoleKeys
) {}
```

O BFF deve consolidar o contrato operacional de acessos:

```ts
interface AssignmentAuditItem {
  id: string;
  occurredAt: string;
  actorSubject: string;
  targetUserId: string;
  roleKey: string;
  action: 'ASSIGNED' | 'REMOVED';
  correlationId?: string;
}
```

O `ai-orchestrator` deve receber contexto resolvido:

```ts
interface ResolvedRuntimeAuthorization {
  userId: string;
  displayName?: string;
  permissions: string[];
  authzVersion: number;
}
```

### Modelos de Dados

Não há nova tabela no MCAD. O modelo persistente continua no `ecad-authz`:

- `users`: usuário projetado por `idpSubject`/`sub`.
- `roles`: catálogo de papéis oficiais.
- `user_roles`: assignments oficiais.
- `authzVersion`: versão usada para invalidação/cache.

No `identity-sync-api`, remover `roles` de `LogtoUser` como requisito operacional e parar a chamada `GET /users/{id}/roles` em `LogtoManagementClient.listUsers()` e `getUser()`. Se o tipo ainda aceitar `roles?` para testes antigos, `buildIdentityEvent()` deve normalizar para `roles: []` ou omitir o campo no evento publicado.

No frontend, `AuthContext.roles` deve ser removido ou marcado como diagnóstico não operacional. Exibição de perfil principal deve vir de `/api/me`, com payload ampliado para incluir `roles` efetivas ou `primaryRole` derivado do contexto do `ecad-authz`.

### Endpoints de API

Endpoints existentes mantidos:

- `GET /api/me`: deve retornar identidade e metadado de perfil efetivo para exibição, sem depender do token.
- `GET /api/me/permissions`: retorna `{subjectId, permissions, version}` e header `x-authz-version`.
- `GET /api/acessos/assignments`: lista usuários e roles atribuídos via `ecad-authz`, com busca e filtros.
- `GET /api/acessos/papeis`: lista catálogo de papéis via `ecad-authz`.
- `POST /api/acessos/papeis/atribuir`: wrapper de `POST /v1/users/{userId}/roles`.
- `DELETE /api/acessos/papeis/atribuir/:assignmentId`: wrapper de `DELETE /v1/users/{userId}/roles/{roleId}`.
- `POST /sync/logto/users`: dispara sync manual de identidade.

Novos/ajustados:

- `GET /api/acessos/usuarios?query=&page=&size=`: busca/autocomplete de usuários via BFF, retornando `id`, `subject`, `email`, `name`, `status`.
- `GET /api/acessos/atribuicoes/historico?userId=&roleKey=&page=&size=`: proxy BFF para Auditoria.
- `POST /api/ai/v1/*` ou proxy BFF equivalente: deve injetar permissões efetivas para o `ai-orchestrator` por headers internos ou forçar o serviço a consultar `ecad-authz` antes de executar tools.

## Pontos de Integração

- **Logto Management API**: `provision-logto.sh` mantém criação/atualização de SPA, API Resource e usuários de teste. Remover criação de roles, atribuição de roles e JWT customizer `jwt.accessToken.roles`.
- **ecad-authz**: usar endpoints oficiais `/v1/users`, `/v1/roles`, `/v1/users/{userId}/roles`, `/v1/me/authorization-context` e `/v1/users/{userId}/effective-permissions`.
- **RabbitMQ**: continuar publicando em `identity.events` com routing key `identity.user.*`. Eventos antigos com `roles` devem ser aceitos, mas roles ignoradas pelo consumidor.
- **Auditoria**: BFF consulta histórico de assignment no serviço de Auditoria. Caso o serviço ainda não tenha endpoint específico para assignments, a implementação deve primeiro padronizar `entityType` e `action` dos eventos de assignment.
- **.env_qa**: harness de validação deve ler os usuários obrigatórios deste arquivo sem registrar senhas ou tokens.

Tratamento de erros segue os padrões existentes: `401 UNAUTHORIZED/INVALID_TOKEN`, `403 PERMISSION_DENIED`, `409` para assignment duplicado, `503 AUTHZ_UNAVAILABLE` ou `AUDIT_UNAVAILABLE` para upstream indisponível. Tokens nunca entram em logs.

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Nível de Risco | Ação Requerida |
| --------------------------- | ------------------------- | -------------------------------------- | --------------------- |
| `scripts/provision-logto.sh` | Mudança operacional | Remove roles, assignments e JWT customizer. Risco médio por afetar bootstrap. | Reescrever etapas 4-6; atualizar resumo de saída. |
| `services/identity-sync-api` | Mudança de contrato | Deixa de buscar/publicar roles. Risco baixo/médio por compatibilidade com consumer. | Atualizar `LogtoUser`, `events.ts`, `logto.ts`, README e testes. |
| `ecad-authz SyncIdentityUserUseCase` | Mudança autoritativa | Remove criação automática de assignments. Risco alto por afetar provisionamento. | Remover `assignMappedRoles`, ajustar logs/testes e manter upsert identity. |
| BFF `/api/acessos/*` | Evolução API | Adiciona busca/autocomplete, filtros, histórico e invalidação. Risco médio. | Evoluir rotas e testes `acessosRoutes.test.ts`. |
| Frontend auth/UX | Remoção de legado | Remove roles do callback, header e auditoria. Risco médio por navegação pós-login. | Usar permissões e `/api/me` como fonte de UX. |
| `ai-orchestrator` | Segurança | Remove confiança em JWT scope/permissions/roles. Risco médio. | Resolver contexto via BFF/ecad-authz; remover fallback admin por role. |
| Seeds/migração | Dados | Backfill de assignments existentes. Risco alto por potencial perda de acesso. | Criar script dry-run/apply/report antes do cutover. |
| Cache BFF/Frontend | Consistência | SLA de revogação/concessão até 5 minutos. Risco médio. | Ajustar TTL/staleTime/gcTime e invalidar por `x-authz-version`. |

## Abordagem de Testes

### Testes Unitários

- `identity-sync-api`: evento publicado não contém roles de negócio; Logto client não chama `/users/{id}/roles`; usuários suspensos continuam mapeados corretamente.
- `ecad-authz`: `SyncIdentityUserUseCase` faz upsert sem `saveAssignment`; evento com `roleKeys` incrementa métrica/log de ignorado, mas retorna `ignoredRoleKeys` e `assignedRoles=0` se o campo permanecer.
- BFF: permissões para listar/atribuir/remover; busca de usuários; filtros por domínio; histórico via Auditoria; mapeamento de 401/403/409/503.
- Frontend: `CallbackPage` não usa roles; `Header` usa perfil do contexto; `RowAuditHistoryButton` usa permissão; `AtribuicoesPage` exige confirmação de remoção e invalida queries.
- `ai-orchestrator`: `assertPermission` não considera roles `admin/super-admin`, não usa scopes do JWT como permissions e rejeita contexto sem permissões efetivas.

### Testes de Integração

- BFF + `ecad-authz` fake: assignment novo retorna `x-authz-version`, UI/BFF invalida cache e refaz `/api/me/permissions`.
- Identity sync + RabbitMQ fake: sync manual publica somente identidade/status.
- Migração dry-run: lê export de Logto, resolve papéis em `seeds/mcad/roles.json`, detecta roles sem mapeamento e não executa escrita.
- QA E2E com usuários `.env_qa`: usuário sem assignment recebe 403; novo assignment libera acesso em até 5 minutos; remoção revoga em até 5 minutos; login funciona sem role/roles no token.
- Contrato de Auditoria: atribuição e remoção geram eventos consultáveis pelo BFF com `actor`, `target`, `roleKey`, `action` e `correlationId`.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **ecad-authz**: remover autoassignment permanentemente e ajustar testes. É a mudança que impede regressão de origem.
2. **identity-sync-api**: publicar identidade pura e atualizar documentação/testes. Mantém usuários sincronizados sem alimentar assignments.
3. **Migração/backfill**: criar script `scripts/migrate-logto-roles-to-authz-assignments.*` com `--dry-run`, `--apply` e relatório antes/depois.
4. **Provisionamento Logto**: remover roles, assignment e customizer, mantendo SPA/API Resource/usuários.
5. **BFF Acessos + Auditoria**: evoluir endpoints, histórico e invalidação por versão.
6. **Frontend**: migrar callback, header, auditoria e Atribuições para permissões/contexto.
7. **ai-orchestrator**: trocar contexto por permissões efetivas resolvidas, removendo fallback por role/scope.
8. **Cutover QA**: executar seed, migração, sync, validação `.env_qa`, remoção final de roles/customizer no tenant.

### Dependências Técnicas

- Deploy coordenado do `ecad-authz` antes de desligar roles no Logto.
- Endpoint/contrato de Auditoria para eventos de assignment.
- Token administrativo do `ecad-authz` para migração e seed.
- Acesso à Management API do Logto para exportar estado atual e remover customizer/roles.
- Configuração de `ME_CACHE_TTL_SECONDS` e React Query compatível com SLA de 5 minutos.

## Monitoramento e Observabilidade

- Métricas:
  - `identity_sync_users_published_total`
  - `identity_sync_roles_ignored_total`
  - `authz_identity_role_keys_ignored_total`
  - `bff_acessos_assignment_requests_total{action,outcome}`
  - `bff_acessos_assignment_latency_ms`
  - `ai_authz_context_resolution_total{outcome}`
- Logs estruturados:
  - `identity_user_synced` sem roles e com contagem de roles ignoradas.
  - `acessos.papel.atribuir` e `acessos.papel.remover` com actor, target, roleKey, outcome, status e correlationId.
  - `audit assignment history unavailable` em `warn` quando Auditoria falhar.
- Auditoria:
  - Todo assignment/removal operacional deve gerar evento auditável, preferencialmente `USER_ACTION` com `entityType=UserRoleAssignment`.
- Dashboards:
  - Taxa de assignments por Gestor vs super-admin.
  - Latência e erro dos upstreams `ecad-authz` e Auditoria.
  - Validação de SLA de propagação até 5 minutos.

## Considerações Técnicas

### Decisões Principais

- Remover o comportamento legado no `ecad-authz` sem flag. A decisão reduz estados ambíguos e impede reativação acidental do IdP como fonte de autorização.
- Reusar BFF Fastify, React Query e helpers de permissão existentes. Não criar SDK novo para o frontend.
- Manter `seeds/mcad/assignments.json` como fixture de teste/desenvolvimento, não mecanismo operacional de governança.
- Preferir script de migração idempotente com relatório antes/depois a alteração manual no banco.
- Usar Auditoria como fonte de histórico, não logs locais do BFF.

### Riscos Conhecidos

- **Perda de acesso por mapeamento incompleto**: mitigado por dry-run, relatório de roles sem mapeamento e comparação efetiva dos usuários `.env_qa`.
- **Token sem audience após remover scopes antigos**: validar em Logto que `resource` no Authorization Code + PKCE continua emitindo JWT de API sem scope `roles`.
- **Cache acima do SLA**: garantir `ME_CACHE_TTL_SECONDS <= 300` e `staleTime <= 300000`; preferir invalidação por `x-authz-version` após atribuição/removal.
- **Auditoria sem contrato de assignment**: bloquear a entrega da tela completa até o endpoint/entidade estar definido.
- **Serviços ainda lendo roles**: usar busca estática por `roles`, `hasRole`, `scope`, `x-mcad-roles` como gate de revisão.

### Requisitos Especiais

- Propagação de concessão e revogação em até 5 minutos.
- Nenhum log deve expor access token, senha, segredo M2M ou conteúdo sensível do `.env_qa`.
- Usuário sem assignment deve ter deny seguro em UI e backend.
- Remoção de role/roles do token deve ser validada por teste de login real.

### Conformidade com Padrões

- Segue ADR 0001: Logto autentica; `ecad-authz` autoriza.
- Segue ADR 0004 e ADR 0008: frontend usa BFF, não `ecad-authz` direto para fluxos operacionais.
- Segue ADR 0007: domínio `acessos` separa gestão de pessoas do super-admin técnico.
- Mantém autorização backend autoritativa nas APIs .NET/Java; permissões no frontend são somente UX.
- Aplica padrões locais: Node/Fastify com testes `node --test`, React/Vite com Vitest/Testing Library, Java Spring no `ecad-authz`, logs estruturados e deny seguro em falhas de authz.
