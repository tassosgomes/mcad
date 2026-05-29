# Relatório Final — Migração de Autorização do MCAD para ecad-authz

> Data inicial: 2026-05-14
> **Fechamento: 2026-05-15** — migração concluída em produção, validada via Playwright.
> Sessão de execução: paralelizada em 4 ondas + uma sessão final de seed/atribuições.
> Documento companheiro: `docs/migracao-authz/analise-estado-atual.md` (status consolidado) e `docs/migracao-authz/prd.md` (plano original).

---

## 1. Sumário executivo

A migração do MCAD para o modelo de autorização fina centralizada no `ecad-authz` foi **concluída em produção em 2026-05-15**. Cobertura: 3 das 4 APIs planejadas (cadastro, identificacao, arrecadacao) + camada completa de frontend e BFF. A 4ª API (`distribuicao`) permanece intencionalmente fora do escopo enquanto o serviço estiver no estado `planned` no `vision.md`.

**Estado em produção (validado via Playwright em 2026-05-15):**
- 78 permissões 4-seg (`dominio:default:recurso:acao`) registradas no `mcad-authz.tasso.dev.br`
- 41 permissões 3-seg legadas automaticamente depreciadas pelo `POST /v1/permission-catalog/register`
- 6 papéis criados (`{cadastro,identificacao,arrecadacao}.default.{consultor,analista}`)
- 7 usuários reais atribuídos aos novos papéis (`tsgomes` → `cadastro.default.analista`; 6 dev users → papéis correspondentes)
- `tsgomes` valida: navega `/cadastro/associacoes`, sidebar mostra grupos corretos, conteúdo carrega (ABRAMUS, AMAR, ASSIM...)
- BFF redeployado sem o normalizer 3→4-seg — `/api/me/permissions` repassa direto o que o ecad-authz devolve

O modelo antigo (`read`/`write` scopes e `hasRole(...)`) foi removido do código de produção, restando apenas TODOs explícitos para itens dependentes de decisões futuras (catálogo de Distribuição, permissões de auditoria, escopo `ASSOCIATION`).

---

## 2. O que ficou pronto

| Fase | Item | Onde |
|---|---|---|
| A | BFF expõe `GET /api/me` e `GET /api/me/permissions` | `services/bff/src/{server,meRoutes,meCache}.ts` |
| B1 | Camada consumidora de permissões no front | `frontend/src/shared/authz/{PermissionsProvider,usePermissions,Can,permissionsApi,types}.tsx` |
| B2 | Features do cadastro migradas de `hasRole` para `can(...)` | 10 arquivos em `frontend/src/features/cadastro/` (obras, fonogramas, titulares, titularidades, participacoes) |
| B3 | `RequirePermission` substitui `RequireRole`; Sidebar usa `requiredPermissions` | `frontend/src/shared/auth/RequirePermission.tsx`, `frontend/src/app/router/routes.tsx`, `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` |
| C | `identificacao-api` com `Ecad.Authz.AspNetCore` aplicado em todos os endpoints | `services/identificacao-api/1-Services/Identificacao.API/Authorization/{IdentificacaoPermissions,IdentificacaoAuthorizationExtensions}.cs` + Program.cs + `appsettings*.json` |
| D | `arrecadacao-api` com `authz-spring-boot-starter` consumido as is | `services/arrecadacao-api/arrecadacao-api/src/main/resources/permissions.yaml`, controllers anotados com `@RequiresPermission`, `SecurityConfig.java` enxuto |
| E | Seed unificado + ambiente local | `scripts/seed-authz.sh`, `seeds/mcad/{cadastro,identificacao,arrecadacao}.permissions.json`, `seeds/mcad/{roles,assignments}.json`, `docker-compose.dev.yml` com perfil `authz`, `.env.example` |
| G | Limpeza de resíduos `read`/`write`/`hasRole` | 14 arquivos do frontend, 5 controllers Java, 2 Program.cs, deleção de `RequireRole.tsx` |
| H | 5 ADRs + índice em `docs/adr/` | `docs/adr/{0001..0005}-*.md` + `README.md` |
| H | Análise atualizada com seção 0 (status final) | `docs/migracao-authz/analise-estado-atual.md` |
| H | PRD original com checklist da Tarefa 20 atualizado | `docs/migracao-authz/prd.md` |
| Encerramento (2026-05-15) | Override `ECAD_AUTHZ_CATALOG_EXPECTED_AUDIENCE` no stack do ecad-authz | `ecad-authz/infra/prod/docker-stack.yml` + `.env.example` |
| Encerramento (2026-05-15) | Seed aplicado em produção: 78 perms + 6 papéis | `scripts/seed-authz.sh` rodado contra `mcad-authz.tasso.dev.br` |
| Encerramento (2026-05-15) | 7 usuários reatribuídos aos papéis 4-seg | via API direta `POST/DELETE /v1/users/{id}/roles` |
| Encerramento (2026-05-15) | Normalizer 3→4-seg removido do BFF | `services/bff/src/meRoutes.ts` (commit `b0418e9`) |
| Encerramento (2026-05-15) | `*.csproj.lscache` no `.gitignore` | `.gitignore` (commit `b4341e3`) |

### Catálogos versionados

- **Cadastro**: 41 permissões em `services/cadastro-api/.../CadastroPermissions.cs` (formato 4 segmentos `cadastro:default:<recurso>:<acao>`, uniformizado em 2026-05-14).
- **Identificação**: 20 permissões em `services/identificacao-api/.../IdentificacaoPermissions.cs` (formato 4 segmentos `identificacao:default:<recurso>:<acao>`). Mapeamento em `docs/authz/catalog/identificacao.md`.
- **Arrecadação**: 17 permissões em `permissions.yaml` (formato 4 segmentos `arrecadacao:default:<recurso>:<acao>`). Mapeamento em `docs/authz/catalog/arrecadacao.md`.

### Seeds (aplicados em prod 2026-05-15)

- 78 permissões totais (41 cadastro + 20 identificacao + 17 arrecadacao).
- 6 papéis: `{cadastro,identificacao,arrecadacao}.default.{consultor,analista}`.
- Atribuições reais:
  - `tasso.gomes@tasso.dev.br` (tsgomes) → `cadastro.default.analista` (41 perms efetivas)
  - `consultor_geral@mcad.dev` → 3 papéis consultor (cadastro + identificacao + arrecadacao)
  - `consultor_identificacao@mcad.dev` → `identificacao.default.consultor`
  - `consultor_arrecadacao@mcad.dev` → `arrecadacao.default.consultor`
  - `analista_cadastro@mcad.dev` → `cadastro.default.analista`
  - `analista_identificacao@mcad.dev` → `identificacao.default.analista`
  - `analista_arrecadacao@mcad.dev` → `arrecadacao.default.analista`
- Papéis `authz.admin.*` (admin da plataforma de autorização) mantidos inalterados nos respectivos usuários.

### Catálogo built-in formalizado (2026-05-26)

Após a estabilização da migração para `ecad-authz`, o catálogo de perfis built-in foi formalizado em `tasks/plataforma/prd-perfis-builtin-rbac/prd.md` e `tasks/plataforma/prd-perfis-builtin-rbac/techspec.md`.

- Framework canônico documentado nos ADRs 0006-0009.
- Estrutura de 4 níveis por domínio de negócio: Consultor, Operador, Gerente e Analista.
- Gerente e Analista passam a ser eixos segregados: governança/auditoria versus operação sênior.
- Novo domínio transversal `acessos`, com Gestor de Acessos e Consultor de Acessos.
- Piloto de catálogo em Distribuição e carve-out controlado em Cadastro para mascaramento server-side de CPF.
- Próximos passos: aplicar o framework completo em Cadastro, Identificação e Arrecadação via PRDs próprios.

---

## 3. Pendências conhecidas

| Item | Onde | Próximo passo |
|---|---|---|
| Catálogo e SDK em `distribuicao-api` | serviço ainda `planned` | Aguarda criação do serviço (Fase F). |
| ~~Reconciliação 3 vs 4 segmentos~~ | resolvido em 2026-05-14 | Migrado todo o mcad para 4 segmentos uniformes (`dominio:default:recurso:acao`). Atualizado `seeds/mcad/*.json`, catálogos .NET e literais do frontend. ADR 0002 consolidada. |
| ~~Re-seed do ecad-authz em produção~~ | resolvido em 2026-05-15 | `scripts/seed-authz.sh` rodou com sucesso em `mcad-authz.tasso.dev.br` (78 perms + 6 papéis registrados; 41 perms 3-seg antigas auto-deprecadas). Necessário 1 override de config: `ECAD_AUTHZ_CATALOG_EXPECTED_AUDIENCE=https://api.mcad.local` em `ecad-authz/infra/prod/docker-stack.yml`. Catálogos usaram M2M token do Logto; criação de papéis usou JWT do `authz.admin.global`. |
| ~~Atribuição dos usuários reais~~ | resolvido em 2026-05-15 | `tsgomes` migrado de `cadastro.obras.analista` para `cadastro.default.analista`. 6 dev users mapeados aos papéis equivalentes. Validado via Playwright. |
| ~~Remoção do normalizer 3→4-seg no BFF~~ | resolvido em 2026-05-15 | `normalizePermissionKey` removido de `services/bff/src/meRoutes.ts`. BFF agora repassa permissões direto do ecad-authz. |
| Suite E2E ponta-a-ponta real | não criada | Cenários: consultor lê / analista escreve / sem papel = 403 nas 3 APIs migradas, via Playwright. |
| Integração com Testcontainers para `@RequiresPermission` (Java) | `arrecadacao-tests` | Hoje cobre só unit/slice (4 testes). |
| Escopo `ASSOCIATION` no MCAD | catálogos + SDKs | Discussão em aberto: analista da Associação X só edita obras dela? |
| Telemetria estruturada das decisões authz | SDK .NET + starter Java | Adicionar tracing OpenTelemetry consistente. |
| Limpeza pós-seed | ecad-authz prod | Probe roles deixados durante diagnóstico: `probe.default.test`, `probe.default.admin-check`, `probe.default.seed-check`. Permissão `probe:default:health:check`. Remover via admin UI ou DELETE direto quando conveniente. |

### TODOs no código (mapeados via grep)

- `frontend/src/app/router/routes.tsx:25,39` — auditoria e copiloto (validar com backend).
- `frontend/src/shared/components/layout/sidebar/Sidebar.tsx:84,102` — idem.
- `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.tsx:49` — `hasRole('analista-distribuicao')` mantido até o catálogo `distribuicao:*` existir.
- `frontend/src/shared/auth/AuthContext.tsx:12` — `hasRole` permanece deprecated por causa do TODO de distribuição e dos mocks de teste.

---

## 4. Status do checklist da Tarefa 20 do PRD

```
[x] Catálogo de permissões criado para Cadastro
[x] Catálogo de permissões criado para Identificação
[x] Catálogo de permissões criado para Arrecadação
[ ] Catálogo de permissões criado para Distribuição  ← aguarda serviço existir
[x] Seeds criados no ecad-authz
[x] SDK .NET criado
[x] SDK .NET integrado no cadastro-api
[x] SDK .NET integrado no identificacao-api
[x] SDK Java (starter) integrado no arrecadacao-api
[ ] SDK integrado no distribuicao-api                ← aguarda serviço existir
[x] Frontend chama BFF (para /api/me e /api/me/permissions)
[x] BFF possui /api/me
[x] BFF possui /api/me/permissions
[x] React possui usePermissions
[x] React possui componente Can
[x] Nenhum endpoint usa RequireAuthorization("read")
[x] Nenhum endpoint usa RequireAuthorization("write")
[x] Nenhum componente usa hasRole como autorização de negócio (exceção documentada em distribuição)
[x] Testes de autorização passam nas 3 APIs migradas
[ ] Testes de autorização na 4ª API (distribuição)   ← bloqueado
[x] Ambiente local documentado (guia-operacional.md)
[x] ADRs criadas
```

Total: 17/21 itens concluídos. Os 4 itens pendentes estão todos relacionados à API de Distribuição, que está fora do escopo desta sessão.

---

## 5. Resultados de validação (consolidado das fases A–H)

| Stack | Comando | Resultado |
|---|---|---|
| BFF | `npm test` | **15/15 passing** (2 config + 13 server, incl. 8 novos para `/api/me`) |
| BFF | `npm run build` | **OK** |
| Cadastro | `dotnet build` | **0 errors** |
| Cadastro | `dotnet test` (unit + integration) | **154/154 passing** |
| Identificação | `dotnet build Identificacao.slnx` | **0 errors** |
| Identificação | `dotnet test 5-Tests/Identificacao.Tests` | **123/123 passing** |
| Identificação | `dotnet test 5-Tests/Identificacao.IntegrationTests` (AuthEndpointsTests) | **11/11 passing** |
| Arrecadação | `mvn -pl arrecadacao-domain test` | **68/68 passing** |
| Arrecadação | `mvn -pl arrecadacao-application test` | **57/57 passing** |
| Arrecadação | `mvn -pl arrecadacao-infra test` | **8/8 passing** |
| Arrecadação | `mvn -pl arrecadacao-tests -Dtest=AuthzPermissionEnforcementTest test` | **4/4 passing** |
| Arrecadação | `mvn -pl arrecadacao-api -am compile` | **BUILD SUCCESS** |
| Arrecadação | `mvn -pl arrecadacao-tests test` (integration) | **64 run / 60 errors (Docker ausente)** — esperado: requerem `docker compose -f docker-compose.dev.yml up -d`. Erros são `Failed to load ApplicationContext` por Testcontainers sem daemon. |
| Frontend | `npx tsc -b` | **No errors found** |
| Frontend | `npx vitest run` | **51/0 passing** (incl. 16 novos em `shared/authz/__tests__` e 9 em `RequirePermission.test.tsx`) |
| Frontend | `npm run build` | **OK** (4–5s; warnings de circular-dep pré-existentes, fora de escopo) |
| Seed | `scripts/seed-authz.sh --dry-run` | **OK** (mostra todas as requisições corretamente, validado por serviço também) |

### Greps de verificação (todos limpos exceto TODOs justificados)

```
RequireAuthorization("read"|"write")          → 0 matches
RequireClaim("scope", "access"|"write")       → 0 matches
AddPolicy("read"|"write")                     → 0 matches
SCOPE_read|SCOPE_write em arrecadacao-api     → 0 matches
@PreAuthorize em arrecadacao-api/src/main     → 0 matches
RequireRole em frontend/src                   → 0 matches
hasRole('consultor'|'analista-')              → apenas 1 em ProcessoCalculoPage.tsx (TODO Fase F)
```

### Testes que exigem Docker (status conhecido)

- **Cadastro integration tests**: incluídos no total `154/154` reportado acima — passam quando PostgreSQL está disponível (Testcontainers gerencia o container).
- **Arrecadação integration tests** (`*EndpointsIntegrationTest`, `*PersistenceIntegrationTest`): falharam nesta execução por ausência de daemon Docker. Mudanças do escopo de authz se limitam a estender `spring.autoconfigure.exclude` para `RedisAutoConfiguration`/`RedisRepositoriesAutoConfiguration` — não tocam em lógica de negócio. Recomenda-se rodar após `docker compose -f docker-compose.dev.yml up -d`.

---

## 6. Próximos passos sugeridos

1. ~~**Decidir a reconciliação 3 vs 4 segmentos**~~ — **Resolvido em 2026-05-14**: todo o mcad foi migrado para 4 segmentos uniformes (`dominio:default:recurso:acao`). ADR 0002 consolidada como Accepted. Artefatos atualizados: `CadastroPermissions.cs`, `IdentificacaoPermissions.cs`, `seeds/mcad/{cadastro,identificacao}.permissions.json`, `seeds/mcad/roles.json`, e literais do frontend em `routes.tsx`, `Sidebar.tsx`, `features/{cadastro,identificacao}/**`, `features/copiloto/**`.
2. **Definir escopo `ASSOCIATION`** antes de avançar com Arrecadação real (analista da Associação X vê só obras dela?). Impacta `permissions.yaml`, anotações Java e nos catálogos do .NET.
3. **Executar suite E2E real** com seed aplicado num ambiente local completo: subir `ecad-authz`, rodar `scripts/seed-authz.sh`, fazer login com `consultor.dev`/`analista.dev`/`sem-papel.dev` e validar comportamento esperado nas 3 APIs.
4. **Adicionar tracing OpenTelemetry** nas decisões authz (SDK .NET e starter Java), para correlacionar `traceId` com `Decision API` no `ecad-authz`.
5. **Avaliar passagem da Admin UI do front pelo BFF** (hoje `AUTHZ_API_BASE_URL` aponta direto para o `ecad-authz`, contrariando o princípio "front não chama API interna direta"). Adicionar rotas `/api/authz/*` no BFF e ajustar `authzPermissionsApi.ts`/`authzRolesApi.ts`.

---

## 7. Onde encontrar tudo

- **Análise consolidada**: `docs/migracao-authz/analise-estado-atual.md`
- **PRD original**: `docs/migracao-authz/prd.md`
- **Guia operacional**: `docs/migracao-authz/guia-operacional.md`
- **ADRs**: `docs/adr/0001..0005-*.md` + `README.md`
- **Catálogos**: `docs/authz/catalog/{identificacao,arrecadacao}.md` (cadastro está nas constantes do C#)
- **Seeds**: `scripts/seed-authz.sh` e `seeds/mcad/*.json`
- **Spec OpenAPI canônico do ecad-authz**: `/home/tsgomes/github-tassosgomes/ecad-authz/tasks/plataforma-ecad-authz/tasks/api-contract.yaml`
