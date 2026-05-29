---
status: pending
parallelizable: true
blocked_by: ["5.0"]
---

<task_context>
<domain>plataforma/frontend/autorizacao</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>react,bff,react_query,oidc</dependencies>
<unblocks>7.0, 8.0</unblocks>
</task_context>

# Tarefa 6.0: Migrar frontend para permissoes efetivas e tela completa de Atribuicoes

## Relacionada as User Stories

- Gestor de Acessos busca usuario, filtra papeis, atribui/remove e consulta historico.
- Usuario MCAD ve UX baseada em permissao efetiva, nao em role de token.
- Auditor ve historico consolidado com labels acessiveis.

## Visao Geral

Remover dependencias funcionais de `roles` do token no frontend e evoluir a tela de Atribuicoes para uma experiencia administrativa completa consumindo somente o BFF.

## Requisitos

- Callback pos-login e redirecionamento nao podem usar roles do perfil OIDC.
- `AuthContext.roles` deve ser removido ou rebaixado para diagnostico nao operacional.
- `authConfig` nao deve pedir scope/claim `roles` como dependencia funcional.
- Componentes sensiveis devem usar `PermissionsProvider`, `RequirePermission` ou `Can`.
- Header/perfil principal deve vir de `/api/me`, nao do token.
- Tela de Atribuicoes deve ter busca de usuario, filtros de papel, atribuicao, remocao com confirmacao e historico.
- UI acessivel: labels, teclado, estados de carregamento, erros compreensiveis.

## Arquivos Envolvidos

- **Modificar:**
  - `frontend/src/shared/auth/CallbackPage.tsx`
  - `frontend/src/shared/auth/AuthProvider.tsx`
  - `frontend/src/shared/auth/AuthContext.tsx`
  - `frontend/src/shared/auth/authorizedRoutes.ts`
  - `frontend/src/shared/auth/authConfig.ts`
  - `frontend/src/shared/authz/PermissionsProvider.tsx`
  - `frontend/src/app/router/routes.tsx`
  - `frontend/src/features/autorizacao/**`
  - `frontend/src/features/auditoria/components/RowAuditHistoryButton.tsx`
  - Testes correspondentes
- **Referencia:**
  - `frontend/src/shared/auth/RequirePermission.tsx`
  - `frontend/src/shared/authz/Can.tsx`
  - `services/bff/src/acessosRoutes.ts`

## Subtarefas

- [ ] 6.1 Localizar usos de `user.profile.roles`, `AuthContext.roles`, `authorizedRoutes` e `apiAuthzClient` direto.
- [ ] 6.2 Trocar redirecionamento pos-login para permissao/contexto efetivo via `/api/me` e `/api/me/permissions`.
- [ ] 6.3 Ajustar Header/perfil principal para exibir dado efetivo do `ecad-authz` retornado pelo BFF.
- [ ] 6.4 Remover scope/claim `roles` de `authConfig` ou documentar como nao operacional se ainda necessario por compatibilidade temporaria.
- [ ] 6.5 Criar/ajustar cliente BFF para usuarios, papeis, assignments e historico.
- [ ] 6.6 Implementar busca/autocomplete de usuario por nome, email ou identificador.
- [ ] 6.7 Implementar filtros de papeis por dominio, tipo, status e indicacao de papel critico.
- [ ] 6.8 Implementar atribuicao com feedback de sucesso/falha e aviso de propagacao ate 5 minutos.
- [ ] 6.9 Implementar remocao com confirmacao explicita contendo usuario, papel e impacto esperado.
- [ ] 6.10 Exibir historico consolidado de atribuicoes/remocoes via BFF/Auditoria.
- [ ] 6.11 Invalidar React Query de `/api/me/permissions`, assignments e historico apos mutacoes.
- [ ] 6.12 Adicionar testes RTL para callback, gating, atribuicao, remocao, historico e acessibilidade basica.

## Sequenciamento

- Bloqueado por: 5.0
- Desbloqueia: 7.0, 8.0
- Paralelizavel: Sim. Pode iniciar com mocks assim que contratos BFF estiverem definidos.

## Rastreabilidade

- Cobre RF-04 e RF-05.
- Evidencia esperada: UX operacional completa sem uso funcional de roles do token.

## Detalhes de Implementacao

O frontend deve tratar permissoes como UX, nao como autorizacao autoritativa. O BFF/API continuam responsaveis por negar operacoes sem permissao.

Fluxo esperado:

```text
login -> callback -> /api/me + /api/me/permissions -> rota inicial permitida
Atribuicoes -> BFF /api/acessos/* -> mutation -> invalidate queries -> refletir authzVersion
```

## Criterios de Sucesso Verificaveis

- [ ] `cd frontend && npm test` passa.
- [ ] `cd frontend && npm run build` passa.
- [ ] Busca estatica nao encontra decisao funcional baseada em `user.profile.roles`.
- [ ] Usuario sem assignment nao ve acoes protegidas e recebe fallback acessivel.
- [ ] Novo assignment aparece sem relogin apos invalidacao/refetch.
- [ ] Remocao mostra confirmacao especifica e revoga visibilidade apos refetch.
- [ ] Tela atende navegacao por teclado e labels acessiveis nos controles principais.
