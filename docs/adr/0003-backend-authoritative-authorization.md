# ADR 0003 — Backend como Fonte Autoritativa de Autorização

- **Status:** Accepted
- **Data:** 2026-05-14
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** autorização, segurança, frontend, backend

---

## Context

Em sistemas com frontend rico (React, SPAs), é tentador usar o catálogo de permissões para mais do que UX — por exemplo, deixar a SPA "saber" se o usuário é admin e habilitar fluxos privilegiados localmente. Esse padrão é inseguro por construção: a SPA roda no navegador do usuário e pode ser inspecionada e modificada.

No MCAD, antes desta migração, alguns componentes tomavam decisões usando `hasRole('analista-cadastro')`, e o backend, por sua vez, dependia parcialmente de scopes genéricos (`scope=write`). Isso criava um modelo onde:

- O frontend assumia papéis macro como verdade de negócio.
- O backend, com `read`/`write`, não conseguia distinguir entre operações finas.
- Em algumas telas, o "esconder o botão" era o único guardrail efetivo.

A migração para `ecad-authz` (ADR 0001) permite reverter esse padrão: o backend passa a ser a única fonte de verdade, e o frontend usa permissões apenas para UX.

## Decision

- **Toda autorização de negócio é decidida no backend.** Nenhuma rota, endpoint ou comando depende exclusivamente do que o frontend "decidiu".
- **Frontend usa permissões só para UX:** esconder/desabilitar botões, ocultar menus, redirecionar de rotas que o usuário não tem como acessar de forma útil.
- **Implementação por stack:**
  - **.NET** — `RequirePermission("dominio:recurso:acao")` no Minimal API, plugado via `Ecad.Authz.AspNetCore` (`ServiceCollectionExtensions.AddEcadAuthz` + `PermissionAuthorizationHandler`).
  - **Java/Spring** — anotação `@RequiresPermission("arrecadacao:default:recurso:acao")` em serviços e controllers, via `authz-spring-boot-starter`.
  - **React** — componente `<Can permission="...">` e hook `usePermissions()` (em `frontend/src/shared/authz/`). Para guards de rota, `RequirePermission` em `shared/auth/`.
- **Mesmo com `Can` ocultando um botão**, o endpoint correspondente sempre verifica a permissão. UI sem backend equivalente é considerado bug.
- **Documentação operacional** orienta revisores a checar, em cada PR, que toda nova ação no frontend tem `RequirePermission`/`@RequiresPermission` correspondente no backend.

## Consequences

### Positivas
- Modelo de segurança claro: o frontend pode estar comprometido sem comprometer o sistema.
- Possibilita roll-out gradual de mudanças de UX sem precisar revalidar segurança.
- Testes de autorização (401/403/200) ficam no backend, onde o ambiente é controlado.
- Auditoria via ecad-authz captura toda decisão real.

### Negativas
- Duplicação aparente de regras (frontend e backend conhecem o mesmo conjunto de permissões). Mitigado por catálogo único e seeds compartilhados.
- UX pode mostrar ações que falham com 403 se o frontend estiver desatualizado em relação ao backend. Mitigado por `X-Authz-Version` e cache curto.
- Desenvolvedores precisam aprender o padrão "guard UI, validate backend" e não confiar no `Can`.

## Alternatives Considered

1. **Confiar em verificações de role no frontend** (modelo anterior).
   Rejeitada por motivos óbvios de segurança: SPA é território do cliente.

2. **Frontend faz pré-checagem via ecad-authz direto** (sem passar pelo BFF).
   Rejeitada: exporia o ecad-authz ao público, criaria CORS e degradaria latência. Ver ADR 0004 (BFF como ponto de saída único para o front).

3. **Modelo "deny by default" no frontend com nada visível até a primeira chamada**.
   Rejeitada por UX ruim: usuário veria telas vazias até as APIs responderem. Cache eager via `usePermissions` resolve isso sem comprometer segurança.

## References

- `frontend/src/shared/authz/Can.tsx`
- `frontend/src/shared/authz/usePermissions.ts`
- `frontend/src/shared/auth/RequirePermission.tsx`
- `libs/dotnet/Ecad.Authz.AspNetCore/PermissionAuthorizationHandler.cs`
- ADR 0001 — Logto autentica, ecad-authz autoriza
- ADR 0004 — BFF para UX
