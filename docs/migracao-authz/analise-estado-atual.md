# Análise do Estado da Migração para ecad-authz

> Data da análise: 2026-05-14
> Origem: cruzamento entre `docs/migracao-authz/prd.md` (plano original de 20 tasks) e o estado real do código.
> Objetivo deste documento: registrar o que já está feito, o que falta, e o sequenciamento de execução do que resta.

---

## 0. Status final da migração (2026-05-14)

Esta seção foi adicionada ao final da migração para consolidar o estado real do código. As seções 1–6 abaixo permanecem como histórico do plano original.

### Entregue nesta sessão (Fases A–H, parcial)

- **Fase A — BFF:** endpoints `GET /api/me` e `GET /api/me/permissions` implementados em `services/bff/src/server.ts`, com cache curto por sessão e suporte ao header `X-Authz-Version`. Testes cobrindo 401, 200 e fallback.
- **Fase B — Frontend:**
  - `frontend/src/shared/authz/` criado com `PermissionsProvider`, `usePermissions`, `Can`, `permissionsApi` e `types`.
  - `RequirePermission` (em `shared/auth/`) substituindo `RequireRole`.
  - Sidebar e telas de cadastro migradas de `hasRole(...)` para `can('cadastro:<recurso>:<acao>')`.
- **Fase C — Identificacao-API (.NET):** SDK `Ecad.Authz.AspNetCore` plugado; catálogo `IdentificacaoPermissions` definido; endpoints anotados com `RequirePermission`.
- **Fase D — Arrecadacao-API (Java):** `authz-spring-boot-starter` adotado as is; `permissions.yaml` definido em `src/main/resources/`; serviços anotados com `@RequiresPermission` (formato 4 segmentos `arrecadacao:default:<recurso>:<acao>` — alinhado com o padrão uniforme do mcad).
- **Fase E — Seeds e ambiente:** `scripts/seed-authz.sh` consolidado, lendo de `seeds/mcad/*.json`. Dry-run validado.
- **Fase G — Limpeza de legado:** removidos os usos de `RequireAuthorization("read"|"write")` e `hasRole('analista-*' | 'consultor')` nas APIs migradas e no front. Exceção registrada: `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.tsx` mantém `hasRole` com `TODO Fase F` até o catálogo `distribuicao:*` existir.
- **Fase H — ADRs:** 5 ADRs registrados em `docs/adr/` + índice (`docs/adr/README.md`).

### Pendências conhecidas (próximas sessões)

| Item | Onde | Observação |
|---|---|---|
| Catálogo e SDK em `distribuicao-api` | serviço ainda `planned` no `vision.md` | Esperado entrar como Fase F quando o serviço existir. |
| ~~Reconciliação 3 vs 4 segmentos~~ | resolvido em 2026-05-14 | Migração one-shot para 4 segmentos uniformes (`dominio:default:recurso:acao`). ADR 0002 consolidada. Artefatos atualizados: catálogos .NET, seeds e literais do frontend. |
| E2E ponta-a-ponta real | suite a criar | Cenários: consultor lê / analista escreve / sem papel = 403 nas 3 APIs migradas. |
| Testes completos de autorização da arrecadação | `arrecadacao-tests` | Parcial: unit + slice; falta integração com Testcontainers cobrindo `@RequiresPermission`. |
| Escopo `ASSOCIATION` | catálogo + SDKs | Discussão em aberto (ver `docs/adr/README.md` — decisões futuras). |
| Telemetria/logs estruturados de decisões authz | SDK .NET + starter Java | Hoje há log informativo; falta tracing OpenTelemetry consistente com o restante do monorepo. |

### Onde encontrar evidências

- ADRs: `docs/adr/0001` a `0005` + `README.md`.
- Relatório consolidado com saídas de teste/build: `docs/migracao-authz/relatorio-final.md`.
- Catálogos: `services/cadastro-api/.../CadastroPermissions.cs`, `services/identificacao-api/.../IdentificacaoPermissions.cs`, `services/arrecadacao-api/arrecadacao-api/src/main/resources/permissions.yaml`.
- Seeds: `scripts/seed-authz.sh` + `seeds/mcad/*.json`.

---

## 1. Estado real x PRD original

### 1.1 Concluído

| Task PRD | Item | Evidência no código |
|---|---|---|
| T5 | SDK .NET `Ecad.Authz.Sdk` | `libs/dotnet/Ecad.Authz.Sdk/HttpEcadAuthzClient.cs` |
| T6 | Integração ASP.NET Core (`Ecad.Authz.AspNetCore`) | `libs/dotnet/Ecad.Authz.AspNetCore/PermissionAuthorizationHandler.cs`, `ServiceCollectionExtensions.cs` |
| T7 | Cache local no SDK (TTL configurável) | embutido no SDK |
| T8 | `cadastro-api` migrada para permissões finas | `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs` (45+ permissões) e `CadastroAuthorizationExtensions.cs` aplicado em todos os endpoints |
| — | Admin UI no front (catálogo + papéis) | `frontend/src/features/authz/pages/{RolesPage,PermissionsPage}.tsx` + hooks/api |
| T17 (parcial) | Testes de autorização do cadastro | `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/AuthEndpointsTests.cs` |
| T19 (parcial) | Documentação da migração | `docs/migracao-authz/prd.md`, `guia-operacional.md` |

### 1.2 Pendente

| # | Item | Onde | Observação |
|---|---|---|---|
| P1 | BFF não tem `/api/me` nem `/api/me/permissions` | `services/bff/src/server.ts` | Hoje é só proxy/CORS. Bloqueia o front consumir permissões. |
| P2 | Front ainda usa `hasRole('analista-cadastro')` no consumo | `frontend/src/features/cadastro/{obras,fonogramas,titularidades,participacoes}/...`, `shared/auth/RequireRole.tsx`, `shared/components/layout/sidebar/Sidebar.tsx` | Admin UI já existe; falta o lado consumidor (`Can`/`usePermissions`). |
| P3 | `identificacao-api` sem permissões finas | `services/identificacao-api/` | Não consome o SDK `Ecad.Authz.AspNetCore`. |
| P4 | `arrecadacao-api` (Java) sem SDK | `services/arrecadacao-api/` (tem `SecurityConfig.java`, sem permissão fina) | Aproveitar o starter pronto em `ecad-authz/backend/sdk/authz-spring-boot-starter/`. |
| P5 | Distribuição inexistente | — | Status "planned" no `vision.md`. Só registrar catálogo `distribuicao:*` no PRD. |
| P6 | Seeds unificados do ecad-authz | `scripts/` | Há registro inicial do cadastro; falta seed consolidado das outras APIs e dos papéis padrão `*.consultor` / `*.analista`. |
| P7 | Limpeza de `read`/`write` legados | varredura no monorepo | T18 do PRD. |
| P8 | ADRs (T19) | `docs/adr/` | Documentar decisões. |

---

## 2. Plano consolidado em 8 fases

Reorganização das 20 tasks do PRD original, removendo o que já está pronto e respeitando dependências reais.

### Fase A — Plataforma cliente no BFF (desbloqueia o front)
- **A1.** Implementar `GET /api/me` e `GET /api/me/permissions` no BFF.
  - Consome `GET /v1/me/authorization-context` do ecad-authz.
  - Cache em memória por sessão (TTL ≤ 60s).
  - Honra header `X-Authz-Version` para invalidar cache.
  - Testes em `server.test.ts` cobrindo 401, 200 e fallback.

### Fase B — Front consumidor de permissões (depende de A)
- **B1.** Criar `frontend/src/shared/authz/{PermissionsProvider.tsx, usePermissions.ts, Can.tsx}` carregando de `/api/me/permissions`.
- **B2.** Trocar `hasRole('analista-cadastro')` por `can('cadastro:<recurso>:<acao>')` em:
  - `features/cadastro/obras/pages/{ObrasPage,ObraDetailPage}.tsx`
  - `features/cadastro/obras/components/ObraForm.tsx`
  - `features/cadastro/fonogramas/pages/{FonogramasPage,FonogramaDetailPage}.tsx`
  - `features/cadastro/fonogramas/components/FonogramaForm.tsx`
  - `features/cadastro/titularidades/components/TitularidadesSection.tsx`
  - `features/cadastro/participacoes/components/ParticipacoesSection.tsx`
- **B3.** Migrar `shared/auth/RequireRole.tsx` → `RequirePermission` e adaptar `shared/components/layout/sidebar/Sidebar.tsx` para usar `requiredPermissions` em vez de `requiredRoles`.
- **B4.** Manter Logto somente como identidade — frontend não decide autorização (só UX).

### Fase C — Identificação-API (.NET) (paralelo a A e D)
- **C1.** Definir `IdentificacaoPermissions` (catálogo validado contra endpoints reais; base no §4.2 do PRD).
- **C2.** Registrar `AddEcadAuthz(...)` em `Identificacao.API`.
- **C3.** Aplicar `RequirePermission` em todos os endpoints.
- **C4.** Testes de autorização (401/403/200) por permissão.
- **C5.** Atualizar seed do ecad-authz com permissões `identificacao:*`.

### Fase D — Arrecadação-API (Java) (paralelo a A e C)
- **D1.** Adotar `authz-spring-boot-starter` do ecad-authz (`ecad-authz/backend/sdk/authz-spring-boot-starter/`). Decisão: usar **as is** sem fork.
- **D2.** Adicionar dependência ao `arrecadacao-api`, criar `permissions.yaml` no classpath e configurar `application.yaml` (`ecad.authz.enabled`, `base-url`, `service-token`).
- **D3.** Anotar serviços/controllers com `@RequiresPermission("arrecadacao:<recurso>:<acao>")`.
- **D4.** Ajustar `SecurityConfig.java` para deixar o starter assumir as decisões e manter só validação JWT.
- **D5.** Testes (consultor vs analista vs sem permissão).
- **D6.** Atualizar seed do ecad-authz com permissões `arrecadacao:*`.

### Fase E — Seeds e ambiente (depende de C5 e D6)
- **E1.** Criar/atualizar `scripts/seed-authz.sh` que popula:
  - catálogos das 3 APIs (cadastro, identificacao, arrecadacao);
  - papéis `*.consultor` e `*.analista` por domínio;
  - usuários de teste mapeados aos papéis.
- **E2.** Atualizar `docker-compose.dev.yml` para subir `ecad-authz` junto.
- **E3.** Atualizar `.env.example` (`AUTHZ_BASE_URL`, `AUTHZ_TIMEOUT_SECONDS`, `AUTHZ_CACHE_TTL_SECONDS`, tokens de serviço).

### Fase F — Distribuição (placeholder)
- **F1.** Como o serviço ainda não existe, apenas registrar o catálogo `distribuicao:*` no PRD para uso futuro.

### Fase G — Limpeza do legado (depende de B)
- **G1.** Grep e remoção de `RequireAuthorization("read"|"write")`, `RequireClaim("scope","access"|"write")`, `hasRole('consultor'|'analista-*')` no monorepo.
- **G2.** Garantir que `AUTH_ENABLED=false` continua bypassando para dev, sem efeito em produção.

### Fase H — Validação final
- **H1.** ADRs (autenticação Logto + autorização ecad-authz, naming, backend autoritativo, BFF UX).
- **H2.** Rodar checklist da T20 do PRD original.
- **H3.** Suite E2E ponta-a-ponta: consultor lê, analista escreve, sem papel recebe 403.

---

## 3. Riscos e decisões abertas

| ID | Risco / decisão | Recomendação |
|---|---|---|
| R1 | SDK Java próprio vs starter do ecad-authz | Consumir o starter `authz-spring-boot-starter` direto. Verificar compatibilidade Spring Boot 3.3. |
| R2 | Sessão no BFF (cookie vs Bearer passthrough) | Decidir antes de A1. Revogação por sessão do ecad-authz exige `sid` no JWT. |
| R3 | Escopo `ASSOCIATION` (analista vê só obras da própria associação) | Definir antes de D3 — muda assinatura das permissões / chamadas. |
| R4 | Admin UI bate direto no ecad-authz (`AUTHZ_API_BASE_URL`) | Idealmente passar pelo BFF. Avaliar quando A1 estiver pronto. |

---

## 4. Caminho crítico e paralelismo

```
Wave 1 (paralelo): A1, C, D
Wave 2 (paralelo): B (depende de A1), E (depende de C5 + D6)
Wave 3:            G (depende de B), H (depende de tudo)
F entra quando distribuição existir.
```

---

## 5. Convenções a manter

- Permissões sempre no formato `dominio:area:recurso:acao` (4 segmentos, ADR 0002), com `area=default` quando não há subdivisão. Tudo em minúsculas, sem acento.
- Backend é a fonte autoritativa. Front só usa para UX.
- Logto/Keycloak não decidem autorização fina — apenas autenticam.
- `AUTH_ENABLED=false` continua válido para desenvolvimento local; produção exige `true`.
- Toda permissão usada em código deve existir no catálogo versionado e no seed do ecad-authz.

---

## 6. Referências

- `docs/migracao-authz/prd.md` — PRD original (20 tasks)
- `docs/migracao-authz/guia-operacional.md` — guia operacional
- `ecad-authz/docs/architecture-overview.md` — arquitetura da plataforma authz
- `ecad-authz/backend/sdk/authz-spring-boot-starter/` — starter Spring Boot
- `ecad-authz/tasks/plataforma-ecad-authz/tasks/api-contract.yaml` — contrato OpenAPI canônico
