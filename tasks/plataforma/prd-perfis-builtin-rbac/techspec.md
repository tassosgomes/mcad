# TechSpec — Catálogo de Perfis Built-in (Framework RBAC + Piloto Distribuição)

> **Modo de operação:** Pipeline (PRD + Vision Doc + Domain Doc de Distribuição)
> **PRD de origem:** `tasks/plataforma/prd-perfis-builtin-rbac/prd.md`
> **API Contract:** N/A (feature de plataforma; nenhum contrato OpenAPI dedicado)
> **Data:** 2026-05-26
> **Status:** Aprovado

---

## Resumo Executivo

Esta TechSpec materializa, sem ambiguidade técnica, o framework RBAC aprovado no PRD: **4 níveis por domínio de negócio** (Consultor / Operador / Gerente / Analista) com **Gerente e Analista em eixos segregados**, **5 categorias de permissão** (Leitura, Operação reversível, Decisão de status, Ação sensível / UI, Trilha de auditoria), e um **novo domínio transversal `acessos`** com dois perfis (Gestor e Consultor de Acessos). O piloto é o domínio Distribuição.

As mudanças concentram-se em quatro áreas:

1. **Seeds e catálogo do `ecad-authz`** — adicionar permissões e perfis em `seeds/mcad/*.json` e rodar `seed-authz.sh` (idempotente). Sem mudanças no serviço `ecad-authz`.
2. **Backend Java (Distribuição)** — apenas atualizar `@RequiresPermission` em endpoints já existentes para refletir o novo mapeamento de perfis; **nenhuma rota nova**. A trilha de auditoria já é produzida pelos `*CommandHandler` existentes via `AuditClient`.
3. **Backend .NET (Cadastro)** — carve-out cirúrgico para mascaramento server-side de CPF via mapper consciente de permissão. **Sem refactor amplo de Cadastro.**
4. **BFF (Fastify/TS)** — três novos grupos de rotas: `/api/acessos/*` (filtro escopado + atribuir/remover), `/api/distribuicao/processos/{id}/historico` (proxy para `ecad-auditoria` com gating de permissão).
5. **Frontend** — duas novas abas dentro de `/autorizacao/*` (atribuições para o Gestor; visão escopada para o Gerente) + aba "Histórico de Alterações" no `ProcessoDetailPage` + gating de componentes UI (CPF mascarado, exportar, recalcular, justificativa cancelamento).

**Trade-off primário:** centralizar lógica de cross-cutting (escopo do Gerente, proxy de auditoria) no BFF acelera entrega e replicação no Phase 3, à custa de aumentar a responsabilidade do BFF (risco de god-object) e tirar parcialmente o backend de domínio da posição de "dono do dado" para o caso específico de histórico de alterações. O risco é mitigado pela modularização das rotas e pelo fato de o BFF já ser o gateway oficial de autorização.

---

## Skills de Referência

| Skill | Caminho | Decisões Influenciadas |
|-------|---------|------------------------|
| `java-architecture` | `~/.claude/skills/java-architecture/` | Estrutura `*-api`/`*-application`/`*-domain`/`*-infra`; padrão de handlers + anotações |
| `java-testing` | `~/.claude/skills/java-testing/` | JUnit 5 + AssertJ + Testcontainers + WireMock para mock do `ecad-authz` |
| `csharp-dotnet-architecture` | `~/.claude/skills/csharp-dotnet-architecture/` | Camadas numeradas; DI scoped; CQRS sem MediatR |
| `dotnet-testing` | `~/.claude/skills/dotnet-testing/` | xUnit + Testcontainers + `WebApplicationFactory` + mock HTTP do `ecad-authz` |
| `react-architecture` | `~/.claude/skills/react-architecture/` | Estrutura `src/features/*` + `src/shared/auth|authz/*` |
| `react-testing` | `~/.claude/skills/react-testing/` | Vitest + RTL + mock `usePermissions` |
| `common-restful-api` | `~/.claude/skills/common-restful-api/` | `ErrorResponse {code, message, correlationId, details}`; versionamento `/api/v1` |
| `common-roles-naming` | `~/.claude/skills/common-roles-naming/` | Convenção de naming reforçada nos perfis built-in |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                            │
│                                                                          │
│  /autorizacao/papeis             /autorizacao/atribuicoes (NOVO)         │
│  /autorizacao/meu-dominio (NOVO) ProcessoDetailPage > aba Histórico      │
│                                                                          │
│  shared/authz/Can.tsx + usePermissions      (gating de componentes UI)   │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          BFF (Fastify / TypeScript)                      │
│                                                                          │
│  /api/me, /api/me/permissions             (existente — ADR 0004)         │
│  /api/acessos/assignments         (NOVO — filtro escopado)               │
│  /api/acessos/papeis/atribuir     (NOVO — wrapper de assign/unassign)    │
│  /api/distribuicao/processos/{id}/historico (NOVO — proxy audit)         │
└─────────┬──────────────────────────────────────────────────┬─────────────┘
          │                                                  │
          │ JWT                                              │ JWT
          ▼                                                  ▼
┌────────────────────────┐                       ┌─────────────────────────┐
│  ecad-authz            │                       │  ecad-auditoria         │
│  Decision API          │                       │  GET /entities/.../     │
│  /v1/me/...            │                       │  timeline               │
│  /v1/users/...         │                       │                         │
│  /v1/roles/...         │                       │                         │
└────────────────────────┘                       └─────────────────────────┘
          ▲
          │
          │ (seed via ./scripts/seed-authz.sh)
          │
┌─────────┴────────────────────────────────────────────────────────────────┐
│              seeds/mcad/*.json  (catálogo built-in)                      │
│                                                                          │
│  cadastro.permissions.json   (+ 1 permissão: titular:ver-cpf-completo)   │
│  distribuicao.permissions.json (+ 9 permissões NOVAS)                    │
│  acessos.permissions.json    (NOVO — 7 permissões base + 8 escopadas)    │
│  roles.json                  (+ 2 perfis Distribuição, + 2 perfis        │
│                               Acessos, + carve-out em Analista Cadastro) │
│  assignments.json            (+ 4 usuários de teste)                     │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│         Backend Java — Distribuição (services/distribuicao-api/)         │
│                                                                          │
│  @RequiresPermission(...)  em ProcessoController, ProcessoCalculo…       │
│      └─ Sem rotas novas; só atualização do mapeamento role→permissão     │
│         no seed (efeito em runtime via ecad-authz Decision API)          │
│                                                                          │
│  ProcessoAuditEventFactory  já produz DATA_CHANGE para Processo          │
│  (consumido pelo ecad-auditoria)                                         │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│           Backend .NET — Cadastro (services/cadastro-api/)               │
│                                                                          │
│  ICurrentUserPermissions  (NOVA abstração em Application)                │
│      └─ HttpContextCurrentUserPermissions (impl em API)                  │
│  DocumentoMasking.Apply()  (NOVO helper em Application/Titulares)        │
│  Query handlers de Titular consomem ambos via DI                         │
│                                                                          │
│  Endpoints existentes mantidos; somente o conteúdo da resposta muda      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados — exemplos críticos

**(A) Gerente abre aba "Histórico de Alterações" de um Processo:**

1. `ProcessoDetailPage` (frontend) renderiza condicionalmente a aba via `<Can permission="distribuicao:default:processo:ver-historico-alteracoes">`.
2. Ao clicar, frontend chama `GET /api/distribuicao/processos/{id}/historico` (BFF).
3. BFF: resolve `authorization-context`, valida a permissão, encaminha a `GET /entities/Processo/{id}/timeline` no `ecad-auditoria`.
4. `ecad-auditoria` retorna eventos `USER_ACTION` e `DATA_CHANGE` (com diff `before`/`after`).
5. BFF devolve payload ao frontend, que renderiza linha por linha.

**(B) Gerente abre "Acessos do meu domínio":**

1. Frontend chama `GET /api/acessos/assignments?page=...`.
2. BFF resolve `authorization-context`, extrai todos os `acessos:{dominio}:papel:visualizar` presentes; deriva lista `["distribuicao"]` (ex.).
3. BFF chama `ecad-authz` `GET /v1/users?...` (com paginação) e filtra resultados para usuários com algum papel em `distribuicao.default.*`.
4. Lista filtrada devolvida ao frontend.

**(C) Analista de Distribuição consulta lista de créditos com CPF:**

1. Frontend chama `GET /api/v1/processos/{id}/creditos` (Distribuição) que, internamente, busca Titular em Cadastro via ACL.
2. `cadastro-api` recebe a chamada (propagação de JWT do usuário a confirmar).
3. `ListarTitularesQueryHandler` mapeia `Titular → TitularResponse`; injeta `ICurrentUserPermissions`.
4. Se caller tem `cadastro:default:titular:ver-cpf-completo` → CPF completo no payload. Senão → mascarado.
5. Distribuição agrega ao DTO de crédito e devolve.

---

## Design de Implementação

### Interfaces Principais

**1) ICurrentUserPermissions (.NET — Cadastro)**

```csharp
// services/cadastro-api/2-Application/Cadastro.Application/Common/Authorization/ICurrentUserPermissions.cs
namespace Cadastro.Application.Common.Authorization;

public interface ICurrentUserPermissions
{
    bool Has(string permission);
}
```

```csharp
// services/cadastro-api/1-Services/Cadastro.API/Authorization/HttpContextCurrentUserPermissions.cs
namespace Cadastro.API.Authorization;

public sealed class HttpContextCurrentUserPermissions(IHttpContextAccessor accessor)
    : ICurrentUserPermissions
{
    public bool Has(string permission)
    {
        var user = accessor.HttpContext?.User;
        if (user is null || !user.Identity?.IsAuthenticated == true) return false;
        return user.HasClaim(c => c.Type == "permission" && c.Value == permission);
    }
}
```

**2) DocumentoMasking (.NET — Cadastro)**

```csharp
// services/cadastro-api/2-Application/Cadastro.Application/Titulares/DocumentoMasking.cs
namespace Cadastro.Application.Titulares;

public static class DocumentoMasking
{
    public static (string Documento, string DocumentoFormatado) Apply(
        string documento, string documentoFormatado, bool fullAllowed)
        => fullAllowed
            ? (documento, documentoFormatado)
            : ("XXXXXXXXXXX", MaskFormatted(documentoFormatado));

    private static string MaskFormatted(string formatado) =>
        formatado.Length == 14 ? "XXX.***.***-XX" : "XX.XXX.***/****-XX";
}
```

**3) Rotas novas no BFF (Fastify)**

```typescript
// services/bff/src/acessosRoutes.ts (esqueleto)
export async function registerAcessosRoutes(server: FastifyInstance, opts: AcessosRoutesOptions) {
  server.get('/api/acessos/assignments', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, opts);
    if (!ctx) return;

    const allDomainsAccess = ctx.permissions.includes('acessos:default:papel:listar');
    const scopedDomains = allDomainsAccess
      ? null
      : ctx.permissions
          .filter(p => /^acessos:[a-z]+:papel:visualizar$/.test(p))
          .map(p => p.split(':')[1]);

    if (!allDomainsAccess && (!scopedDomains || scopedDomains.length === 0)) {
      reply.code(403).send({ code: 'PERMISSION_DENIED' });
      return;
    }

    const upstream = await fetchAuthzUsers(opts, request.query);
    const filtered = filterByDomains(upstream, scopedDomains);
    reply.send(filtered);
  });

  server.post('/api/acessos/papeis/atribuir', async (request, reply) => { /* … */ });
  server.delete('/api/acessos/papeis/atribuir/:assignmentId', async (request, reply) => { /* … */ });
}
```

```typescript
// services/bff/src/historicoRoutes.ts (esqueleto)
export async function registerHistoricoRoutes(server: FastifyInstance, opts: HistoricoRoutesOptions) {
  server.get('/api/distribuicao/processos/:id/historico', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, opts);
    if (!ctx) return;
    if (!ctx.permissions.includes('distribuicao:default:processo:ver-historico-alteracoes')) {
      reply.code(403).send({ code: 'PERMISSION_DENIED' });
      return;
    }
    const events = await fetchAuditTimeline(opts, 'Processo', request.params.id, request.headers.authorization);
    reply.send(events);
  });
}
```

### Modelos de Dados

> Esta feature **não introduz novas tabelas** no PostgreSQL de nenhum serviço. Tudo é catálogo de permissões + comportamento.

#### Mapeamento Entidade do Domínio → Modelo Técnico

| Entidade do Domain Doc (Distribuição) | Modelo Técnico | Local | Observação |
|---|---|---|---|
| Processo de Distribuição | `Processo` (entity) | `distribuicao-domain/.../Processo.java` | Sem mudanças |
| Crédito | `Credito` (entity) | `distribuicao-domain/.../Credito.java` | Sem mudanças; `CreditoResponse` ganha campo `ver-cpf-titular`-gated indiretamente via ACL Cadastro |
| Crédito Retido | `CreditoRetido` | idem | Sem mudanças |

#### Modelos do catálogo (JSON, não código)

| Arquivo | Conteúdo principal |
|---|---|
| `seeds/mcad/distribuicao.permissions.json` | Adicionar 9 entradas (ver lista em "Inventário"); reclassificar `description` das 9 existentes com tag de categoria |
| `seeds/mcad/cadastro.permissions.json` | Adicionar 1 entrada: `cadastro:default:titular:ver-cpf-completo` |
| `seeds/mcad/acessos.permissions.json` (NOVO) | 7 permissões base do domínio `acessos` + 8 escopadas (`acessos:{dominio}:papel:visualizar` e `acessos:{dominio}:atribuicao:ver-historico` para 4 domínios) |
| `seeds/mcad/roles.json` | Adicionar 4 perfis (Distribuição: operador, gerente; Acessos: gestor, consultor); ampliar Distribuição.analista; ampliar Cadastro.analista com `titular:ver-cpf-completo` |
| `seeds/mcad/assignments.json` | Adicionar 4 usuários de teste |

#### Convenção de claims no JWT

O `ecad-authz` já popula as permissões do usuário no JWT (claim `permission` repetida). O `ICurrentUserPermissions` consome essa estrutura. Nenhuma mudança de claim.

### Endpoints de API

Esta feature **não introduz endpoints novos nos backends Java/.NET de domínio**. As mudanças concentram-se em:

#### Backends de domínio (Java / .NET) — sem endpoints novos

| Endpoint existente | Mudança |
|---|---|
| `POST /api/v1/processos`, `/aprovar`, `/finalizar`, `/cancelar`, `/calcular`, `GET /api/v1/processos/...` (Distribuição) | Nenhuma mudança de código. `@RequiresPermission` permanece. O efeito do refactor está no **catálogo de perfis built-in** (quem recebe quais permissões), não no código. |
| `GET /api/v1/titulares`, `GET /api/v1/titulares/{id}` (Cadastro) | Resposta passa a aplicar `DocumentoMasking` conforme `ICurrentUserPermissions`. Mesma URL, mesmo contrato JSON; o conteúdo de `Documento`/`DocumentoFormatado` muda conforme caller. |

#### BFF (Fastify) — endpoints novos

| Método + Caminho | Descrição | Permissão verificada |
|---|---|---|
| `GET /api/acessos/assignments` | Lista usuários e seus papéis; aplica filtro escopado por domínio | `acessos:default:papel:listar` (full) OU `acessos:{dominio}:papel:visualizar` (scoped) |
| `POST /api/acessos/papeis/atribuir` | Atribui um perfil built-in a um usuário | `acessos:default:papel:atribuir` |
| `DELETE /api/acessos/papeis/atribuir/{assignmentId}` | Remove perfil de um usuário | `acessos:default:papel:remover` |
| `GET /api/acessos/papeis` | Lista catálogo built-in (de todos os domínios) | `acessos:default:papel:listar` |
| `GET /api/distribuicao/processos/{id}/historico` | Proxy ao timeline do `ecad-auditoria` | `distribuicao:default:processo:ver-historico-alteracoes` |

**Formato de erro:** mantém o padrão `ErrorResponse {code, message, correlationId}` (ADR 0004).

**Cache:** o `meCache` (contexto authz) continua sendo a fonte de verdade de permissões; sem cache adicional para audit timeline na entrega.

#### Frontend — rotas novas

| Caminho | Componente | Gating |
|---|---|---|
| `/autorizacao/atribuicoes` | `AtribuicoesPage.tsx` | `<RequirePermission permission="acessos:default:papel:atribuir">` OU `papel:listar` |
| `/autorizacao/meu-dominio` | `MeuDominioPage.tsx` | qualquer `acessos:*:papel:visualizar` |
| `/distribuicao/processos/:id` aba "Histórico" | `ProcessoDetailPage.tsx` (modificado) | `<Can permission="distribuicao:default:processo:ver-historico-alteracoes">` |

---

## Mapeamento RN-XX → Validação/Teste

| RN do Domain Doc | Onde aplica | Como será testado |
|---|---|---|
| RN-12 (disparo manual pelo Analista) | Generalizado: Operador ou Analista chamam `processo:criar`/`processo:calcular`; Gerente ou Analista chamam `processo:aprovar`/`finalizar`/`cancelar` | Integration test por endpoint × perfil (4 perfis × N endpoints) |
| RN-13 (pré-requisitos do processo) | Validação interna do handler atual | Inalterado; teste existente |
| RN-14 (publicação `distribuicao.rol.processado` em finalização) | Inalterado; produzido pelo `FinalizarProcessoCommandHandler` | Teste existente |
| RN-08 (idempotência do cálculo) | A permissão `processo:calcular` está em Operador (reversível); `recalcular-pos-calculado` em Analista (sensível) | Teste verifica que Operador pode calcular mas não recalcular após CALCULADO |

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Skills Aplicáveis | Descrição |
|---------|------|-------------------|-----------|
| `seeds/mcad/acessos.permissions.json` | Seed JSON | `common-roles-naming` | 15 permissões do novo domínio transversal (7 base + 8 escopadas por domínio) |
| `docs/adr/0006-perfis-built-in-rbac.md` | ADR | - | Framework canônico (já escrito como Proposed) |
| `docs/adr/0007-dominio-acessos-segregado.md` | ADR | - | Domínio transversal de acessos |
| `docs/adr/0008-bff-gateway-cross-cutting.md` | ADR | - | BFF como gateway |
| `docs/adr/0009-cpf-masking-permission-aware-mapper.md` | ADR | - | Mascaramento server-side de CPF |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/Authorization/ICurrentUserPermissions.cs` | Interface | `csharp-dotnet-architecture` | Abstração de leitura de permissões do caller |
| `services/cadastro-api/2-Application/Cadastro.Application/Titulares/DocumentoMasking.cs` | Helper | `csharp-dotnet-architecture`, `dotnet-code-quality` | Função pura de mascaramento de CPF/CNPJ |
| `services/cadastro-api/1-Services/Cadastro.API/Authorization/HttpContextCurrentUserPermissions.cs` | Service Impl | `csharp-dotnet-architecture` | Implementação concreta lendo `HttpContext.User.Claims` |
| `services/cadastro-api/5-Tests/Cadastro.UnitTests/Titulares/DocumentoMaskingTests.cs` | Unit Test | `dotnet-testing` | Casos de mascaramento puros |
| `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Titulares/TitularCpfMaskingTests.cs` | Integration Test | `dotnet-testing` | Caller com/sem permissão × CPF mascarado/completo |
| `services/bff/src/acessosRoutes.ts` | Fastify Routes | `common-restful-api` | Rotas `/api/acessos/*` (assignments, atribuir, remover, catálogo) |
| `services/bff/src/historicoRoutes.ts` | Fastify Routes | `common-restful-api` | Rota `/api/distribuicao/processos/:id/historico` (proxy audit) |
| `services/bff/src/acessosRoutes.test.ts` | Integration Test (BFF) | - | Cenários: sem JWT, sem perm, scoped, full, upstream 503 |
| `services/bff/src/historicoRoutes.test.ts` | Integration Test (BFF) | - | Cenários do proxy de audit |
| `frontend/src/features/autorizacao/atribuicoes/AtribuicoesPage.tsx` | React Page | `react-architecture` | Tela do Gestor de Acessos (atribuir/remover papéis) |
| `frontend/src/features/autorizacao/atribuicoes/AtribuicoesPage.test.tsx` | RTL Test | `react-testing` | Atribuir / remover / 403 sem perm |
| `frontend/src/features/autorizacao/meu-dominio/MeuDominioPage.tsx` | React Page | `react-architecture` | Tela do Gerente — assignments escopados |
| `frontend/src/features/autorizacao/meu-dominio/MeuDominioPage.test.tsx` | RTL Test | `react-testing` | Gerente vê só seu domínio |
| `frontend/src/features/distribuicao/processos/components/HistoricoAlteracoesTab.tsx` | React Component | `react-architecture` | Aba/seção que consome `/api/distribuicao/processos/{id}/historico` |
| `frontend/src/features/distribuicao/processos/components/HistoricoAlteracoesTab.test.tsx` | RTL Test | `react-testing` | Render por perfil; loading; erro |
| `tooling/e2e/tests/11-gerente-historico.spec.ts` *(se a suite E2E do `finalizar-integracao-authz` estiver em vigor)* | Playwright | - | Gerente vê histórico; Analista não |

### Arquivos a Modificar

| Caminho | Skills Aplicáveis | Alteração |
|---------|-------------------|-----------|
| `seeds/mcad/distribuicao.permissions.json` | `common-roles-naming` | Adicionar 9 permissões NOVO; reclassificar `description` das 9 existentes com tag de categoria |
| `seeds/mcad/cadastro.permissions.json` | `common-roles-naming` | Adicionar `cadastro:default:titular:ver-cpf-completo` |
| `seeds/mcad/roles.json` | `common-roles-naming` | Adicionar 4 perfis (`distribuicao.default.operador`, `distribuicao.default.gerente`, `acessos.default.gestor`, `acessos.default.consultor`); ampliar permissões de `distribuicao.default.analista`; ampliar `cadastro.default.analista` com `titular:ver-cpf-completo` |
| `seeds/mcad/assignments.json` | - | Adicionar 4 usuários de teste (`operador.dev`, `gerente.dev`, `gestor-acessos.dev`, `consultor-acessos.dev`) |
| `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/ListarTitularesQueryHandler.cs` | `csharp-dotnet-architecture` | Constructor recebe `ICurrentUserPermissions`; mapeamento aplica `DocumentoMasking.Apply` |
| `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/BuscarTitularPorIdQueryHandler.cs` | `csharp-dotnet-architecture` | Idem ao acima |
| Demais query handlers que retornam `Documento` em DTOs de Cadastro (a auditar via grep) | `csharp-dotnet-architecture` | Idem |
| `services/cadastro-api/1-Services/Cadastro.API/Program.cs` | `csharp-dotnet-architecture` | Registrar `IHttpContextAccessor` e `HttpContextCurrentUserPermissions` no DI (`Scoped`) |
| `services/bff/src/server.ts` | - | `registerAcessosRoutes(...)` e `registerHistoricoRoutes(...)` na boot |
| `services/bff/src/config.ts` | - | Validar `AUTHZ_BASE_URL`, `AUDIT_BASE_URL`, `AUDIT_TIMEOUT_MS` |
| `services/bff/.env.example` | - | Adicionar `AUDIT_BASE_URL`, `AUDIT_TIMEOUT_MS` |
| `frontend/src/app/router/routes.tsx` | `react-architecture` | Adicionar rotas `/autorizacao/atribuicoes` e `/autorizacao/meu-dominio` com gating |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | `react-architecture` | Sub-itens do módulo "Autorização" gateados por perfil (super-admin, Gestor, Gerente) |
| `frontend/src/features/distribuicao/processos/pages/ProcessoDetailPage.tsx` | `react-architecture` | Renderizar `<HistoricoAlteracoesTab>` condicionalmente; ocultar "Dados do Cancelamento" sem `ver-justificativa-cancelamento`; ocultar botão "Recalcular" sem `recalcular-pos-calculado` |
| `frontend/src/features/distribuicao/processos/components/ProcessoActions.tsx` | `react-architecture` | Gating de "Exportar" via `processo:exportar` (botão a adicionar se ainda não existe no design) |
| `scripts/seed-authz.sh` | - | Garantir que o seed registra o novo domínio `acessos` (verificar; o script atual percorre `seeds/mcad/*.permissions.json` automaticamente — confirmar) |
| `docs/adr/README.md` | - | Adicionar entradas para ADRs 0006–0009 |
| `services/distribuicao-api/distribuicao-tests/.../AuthzPermissionEnforcementTest.java` | `java-testing` | Ampliar matriz: Operador (3 estados), Gerente (3 estados), Analista (3 estados), Consultor (3 estados) × pelo menos 9 endpoints |

### Arquivos de Referência (não alterar)

| Caminho | Motivo da Consulta |
|---------|-------------------|
| `services/distribuicao-api/distribuicao-application/.../audit/ProcessoAuditEventFactory.java` | Confirmar shape do evento `DATA_CHANGE` consumido pelo `ecad-auditoria` |
| `services/distribuicao-api/distribuicao-api/.../controllers/ProcessoController.java` | Padrão de `@RequiresPermission` (não alterar) |
| `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroAuthorizationExtensions.cs` | Padrão de `RequireCadastroPermission` (não alterar) |
| `services/bff/src/meRoutes.ts` | Padrão de resolução de `authorization-context` (replicar via helper compartilhado) |
| `frontend/src/shared/authz/Can.tsx` | Padrão de gating de componente |
| `frontend/src/shared/auth/RequirePermission.tsx` | Padrão de gating de rota |
| `/home/tsgomes/github-tassosgomes/ecad-authz/backend/sdk/authz-spring-boot-starter/src/main/java/br/org/ecad/authz/sdk/annotation/RequiresPermission.java` | Contrato do SDK Java |
| `/home/tsgomes/github-tassosgomes/ecad-auditoria/docs/INTEGRATION_GUIDE.md` | Como consumir o timeline endpoint |

---

## Pontos de Integração

### ecad-authz (`mcad-authz.tasso.dev.br`)

- **Propósito:** fonte de decisão de autorização e catálogo de perfis/permissões.
- **Authn:** JWT Bearer (do Logto).
- **Endpoints consumidos:**
  - `GET /v1/me/authorization-context` (já consumido pelo BFF; ADR 0004).
  - `GET /v1/users?...` (NOVO uso: lista assignments).
  - `POST /v1/users/{id}/roles` (NOVO uso pelo Gestor de Acessos).
  - `DELETE /v1/users/{id}/roles/{roleKey}` (NOVO uso pelo Gestor).
  - `POST /v1/permission-catalog/register` (chamado pelo `seed-authz.sh` na boot do mcad ou manualmente).
- **Retry/Timeout:** `AUTHZ_TIMEOUT_MS` existente (default 5000ms); fallback 503 `{code: 'AUTHZ_UNAVAILABLE'}`.
- **Já mapeado no Vision Doc / Domain Doc?** Sim, herança da migração para `ecad-authz` (ADR 0001).

### ecad-auditoria (audit-service standalone)

- **Propósito:** consumir timeline de alterações em entidades de domínio.
- **Authn:** JWT Bearer (do Logto) — confirmado pelo BFF; audit-service responde se aceita.
- **Endpoints consumidos:**
  - `GET /entities/{entityType}/{entityId}/timeline` — específicos do timeline de Processo.
- **Retry/Timeout:** `AUDIT_TIMEOUT_MS` (default 5000ms); fallback 503 ao frontend.
- **Idempotência:** somente leitura; safe.

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|---|---|---|---|
| `seeds/mcad/*.json` | Modificado | Catálogo cresce em ~25 permissões e 4 perfis | Re-seed em DEV + produção (idempotente) |
| `cadastro-api` (TitularResponse) | Modificado | Conteúdo de `Documento` muda conforme caller; baixo risco se permissão for atribuída corretamente a Analista atual | Atualizar testes integration; comunicar release |
| `distribuicao-api` | Não modificado (código) | Só efeito de runtime via novas permissões no catálogo | Ampliar matriz de testes integration |
| `bff` | Modificado | 5 endpoints novos; cresce em responsabilidade (ADR 0008) | Modularizar; cobertura de testes ≥ 90% |
| `frontend` | Modificado | 3 telas/abas novas; gating de componente em pelo menos 4 pontos do `ProcessoDetailPage` | Testes RTL por perfil; smoke E2E com Playwright |
| Identificação API / Arrecadação API / Distribuição API (outros domínios) | Não modificado | Phase 3 — PRDs separados | N/A nesta entrega |
| Dashboards Grafana / alertas | Sem alteração | Auditoria de 403 já é capturada por logs existentes | N/A nesta entrega |
| LGPD / DPIA | Impacto positivo | CPF passa a ser mascarado server-side; documentar no inventário de tratamento | Atualizar inventário de dados |

---

## Abordagem de Testes

### Testes Unitários

- **`DocumentoMaskingTests` (.NET):** entradas válidas/inválidas; `fullAllowed = true|false`; formato CPF (14) e CNPJ (18).
- **`HttpContextCurrentUserPermissionsTests` (.NET):** com/sem `HttpContext`, com/sem claim, várias permissões.
- **BFF `acessosRoutes` (helpers unitários):** função `deriveScopedDomains(permissions)` — entrada com mix de perms, retorna lista correta de domínios.
- Não mockar classes do próprio domínio; mockar apenas `ecad-authz` (HTTP) e `ecad-auditoria` (HTTP).

### Testes de Integração

#### Backend Java — Distribuição

- Ampliar `AuthzPermissionEnforcementTest`: matriz **4 perfis × 9 endpoints × 3 estados** (sem JWT → 401; com JWT sem permissão → 403; com JWT e permissão → 200/201/204).
- Mock do `ecad-authz` via WireMock retornando `{Allowed: true|false}` conforme perfil simulado.
- Cenários adicionais para `recalcular-pos-calculado` (Analista) bloqueando Operador.

#### Backend .NET — Cadastro

- `TitularCpfMaskingTests`:
  - Caller com `cadastro:default:titular:ver-cpf-completo` → CPF completo.
  - Caller sem essa permissão → mascarado.
  - Caller sem nenhuma permissão (sem JWT) → 401 (existente).
- Usar `WebApplicationFactory` com `MockEcadAuthzServer` configurado por cenário (padrão já existente).

#### BFF — Fastify

- `acessosRoutes.test.ts`:
  - `GET /api/acessos/assignments` sem JWT → 401.
  - Com JWT sem permissão de Acessos → 403.
  - Com `acessos:default:papel:listar` → lista completa.
  - Com apenas `acessos:distribuicao:papel:visualizar` → lista escopada a Distribuição.
  - `POST /api/acessos/papeis/atribuir` sem `papel:atribuir` → 403.
  - Upstream `ecad-authz` 503 → BFF devolve 503.
- `historicoRoutes.test.ts`:
  - Sem permissão → 403.
  - Com permissão + upstream 200 → 200 com payload.
  - Upstream timeout → 503.

#### Frontend — Vitest + RTL

- `AtribuicoesPage`: render por perfil (Gestor → form aparece; Consultor de Acessos → form oculto, lista visível).
- `MeuDominioPage`: Gerente recebe lista pré-filtrada do BFF; verificação que componente respeita o filtro.
- `HistoricoAlteracoesTab`: render quando permissão presente; estado de loading; estado de erro; render de diff de `DATA_CHANGE`.
- `ProcessoDetailPage`: gating do botão "Recalcular", da seção "Dados do Cancelamento", do botão "Exportar".

### Testes E2E (Playwright) — opcional, depende da entrega de `finalizar-integracao-authz`

- `consultor-acessos.dev` lê assignments mas não consegue atribuir.
- `gestor-acessos.dev` atribui novo papel a `consultor.dev` e remove em seguida.
- `gerente.dev` (Distribuição) vê apenas assignments de Distribuição; tentativa de chamar BFF com `?domain=cadastro` retorna lista vazia ou 403.
- `gerente.dev` abre aba "Histórico" e vê eventos `DATA_CHANGE`; `analista.dev` não vê a aba.

---

## Sequenciamento de Desenvolvimento

### Build Order

1. **Catálogo e seeds** — sem dependências.
   - Editar `seeds/mcad/distribuicao.permissions.json` (reclassificar + adicionar NOVO).
   - Editar `seeds/mcad/cadastro.permissions.json` (`titular:ver-cpf-completo`).
   - Criar `seeds/mcad/acessos.permissions.json`.
   - Editar `seeds/mcad/roles.json` (4 perfis novos + carve-out Cadastro Analista).
   - Editar `seeds/mcad/assignments.json` (4 usuários de teste).
   - Dry-run e seed em DEV.

2. **Backend .NET (Cadastro) — mascaramento de CPF** — depende de 1 (catálogo precisa ter a permissão).
   - `ICurrentUserPermissions` + `HttpContextCurrentUserPermissions` + DI registration.
   - `DocumentoMasking` (puro).
   - Modificar `ListarTitularesQueryHandler` e `BuscarTitularPorIdQueryHandler`.
   - Auditar e modificar demais handlers que retornam `Documento`.
   - Testes unitário + integration.

3. **Backend Java (Distribuição) — testes** — depende de 1.
   - Ampliar `AuthzPermissionEnforcementTest` para a matriz 4×9×3.
   - Sem código de produção (só testes — o catálogo já controla via runtime).

4. **BFF — endpoint de assignments e atribuição** — depende de 1.
   - `acessosRoutes.ts` + testes.
   - Registrar no `server.ts`.

5. **BFF — endpoint de histórico** — depende de 1 (permissão) + ecad-auditoria já estar acessível.
   - `historicoRoutes.ts` + testes.
   - Adicionar `AUDIT_BASE_URL`, `AUDIT_TIMEOUT_MS` em `config.ts` e `.env.example`.

6. **Frontend — abas e gating do `ProcessoDetailPage`** — depende de 5.
   - `HistoricoAlteracoesTab.tsx`.
   - Gating dos componentes (recalcular, cancelamento, exportar).
   - Testes RTL.

7. **Frontend — telas de Acessos** — depende de 4.
   - `AtribuicoesPage.tsx` + `MeuDominioPage.tsx`.
   - Atualizar `routes.tsx` e `Sidebar.tsx`.
   - Testes RTL.

8. **E2E + Documentação** — depende de 6 e 7.
   - Specs Playwright se aplicável.
   - Atualizar `docs/migracao-authz/relatorio-final.md` com nota da entrega.
   - Atualizar `docs/adr/README.md`.

### Dependências Técnicas Bloqueantes

- `ecad-authz` precisa aceitar registro de domínio `acessos`. Esperado funcionar — `POST /v1/permission-catalog/register` é idempotente e agnóstico ao nome do domínio. Validar com dry-run.
- `ecad-auditoria` precisa estar acessível ao BFF (configurar `AUDIT_BASE_URL`). Em DEV: serviço local; em produção: URL pública (a confirmar).
- Propagação de JWT do usuário em chamadas inter-serviço Distribuição → Cadastro (item de Questões em Aberto): se hoje é service token, o mascaramento de CPF aplicado pela Distribuição pode comportar-se como "sem permissão" mesmo para Analista de Distribuição. Resolver antes de declarar a Fase 1 completa.

---

## Monitoramento e Observabilidade

### Métricas

- **BFF (Prometheus via Fastify metrics):**
  - `bff_acessos_assignments_requests_total{status}` — RED por perfil.
  - `bff_acessos_papeis_atribuir_total{outcome}` — outcome ∈ `{ok, 403, 5xx}`.
  - `bff_historico_proxy_duration_seconds` (histogram) — latência do proxy a `ecad-auditoria`.

### Logs

- BFF logs estruturados (já padrão): `{level, msg, route, status, userSubject, durationMs}`.
- Logar com `INFO` toda atribuição/remoção via Gestor de Acessos (audit trail próprio, redundante com `ecad-authz`).

### Alertas

- 5xx em `/api/acessos/*` > 1% por 5 min → alertar.
- Timeout para `ecad-auditoria` > 10/min → alertar.

### Tracing

- Propagar `x-correlation-id` no proxy a `ecad-authz` e `ecad-auditoria` (padrão já existente).

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Racional | Trade-offs | Alternativas Rejeitadas (ADR) |
|---|---|---|---|
| Centralizar filtro escopado no BFF | Lógica cross-domain vive em um lugar só; replicação no Phase 3 vira "+1 endpoint no BFF" | BFF cresce em responsabilidade | ecad-authz endpoint scoped; backend de domínio (ADR 0008) |
| Mascaramento de CPF via permission-aware mapper | Mantém DTO atual; testável como função pura; cumpre LGPD server-side | 1 dep nova em handlers de Cadastro | Endpoint dedicado; Result filter genérico; só client-side (ADR 0009) |
| Domínio transversal `acessos` separado de `authz` | Segrega administração técnica de governança de pessoas; gerência de acesso auditável | +1 domínio no catálogo | Subdividir `authz:admin:*`; manter como está (ADR 0007) |
| Gerente e Analista em eixos segregados | Segregação de funções real; trilha de auditoria de quem opera fica com quem governa | Quebra expectativa de "Analista vê tudo" | Analista superset; Aprovador no lugar de Gerente (ADR 0006) |
| Carve-out em Cadastro nesta entrega | LGPD não pode esperar PRD pleno de Cadastro | Dívida documentada; refactor amplo virá depois | Adiar para PRD de Cadastro (rejeitado por urgência) |

### Riscos Conhecidos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Propagação de JWT Distribuição→Cadastro hoje usa service token | Baixa | Alto (CPF mascarado mesmo para quem pode ver) | Resolvido na Fase 1: JWT do usuário é propagado por padrão; manter `CADASTRO_TOKEN_STRATEGY=ANALYST_OR_SERVICE` ou `ANALYST_ONLY` |
| BFF vira god-object | Média | Médio | Modularizar rotas; cobrir cada arquivo com seus próprios testes; revisar em retro |
| Audit timeline lento → UI travada | Média | Médio | Timeout firme; UI exibe estado de loading; cache local (futuro) |
| Re-seed em produção remove permissão de usuário real involuntariamente | Baixa | Alto | Re-seed é incremental (idempotente, só adiciona); testar dry-run; backup do estado dos roles antes |
| Frontend gating discrepante do backend gating | Baixa | Médio | Lista de permissões a verificar em PR review; teste E2E com 403 forge URL |

### Requisitos Especiais

- **LGPD:** atualizar inventário de tratamento de dados pessoais (CPF agora é tratado com base no perfil do consumidor).
- **Segurança:** assignments e revogações passam por audit no `ecad-authz` (já implementado); BFF adiciona log estruturado redundante.
- **Performance:** sem otimizações específicas nesta entrega; cache TTL atual do `meCache` permanece.

### Conformidade com Skills

- Segue `csharp-dotnet-architecture` (DI scoped, separação Application/API).
- Segue `java-testing` para ampliação de `AuthzPermissionEnforcementTest`.
- Segue `react-architecture` (features sob `src/features/`).
- Segue `common-restful-api` (envelope `ErrorResponse`, versionamento `/api/v1` — no BFF as rotas são prefixadas `/api/` pois o BFF não versiona).
- Segue `common-roles-naming` (naming 4-segmentos preservado).

**Desvios identificados:** nenhum significativo. O BFF não usa `/api/v1/...` versionado (mantém prática atual; ADR futuro se mudar).

---

## Questões em Aberto

- [x] **Padrão de propagação de JWT em chamadas ACL Distribuição → Cadastro.** Resolvido em `investigation-jwt-propagation.md`: a Distribuição propaga o JWT do usuário por padrão (`ANALYST_OR_SERVICE`), com fallback opcional para service token quando não há bearer do usuário. Para preservar mascaramento por permissão do usuário, não usar `CADASTRO_TOKEN_STRATEGY=SERVICE_ONLY` nesse fluxo.
- [ ] **`AUDIT_BASE_URL` em produção.** Confirmar URL pública do `ecad-auditoria` ou se ele será exposto via Ingress dedicado.
- [ ] **Mapeamento de usuários reais (`tsgomes`, `t3crjdamuir4`, etc.) para os novos perfis.** Decisão de governança ECAD; não bloqueia entrega técnica.
- [ ] **`F07 Demonstrativo` (Domain Doc Distribuição) — quando entra a UI?** As permissões `demonstrativo:visualizar` e `demonstrativo:exportar` ficam definidas e sem uso até a tela existir; reavaliar em Fase 2.
- [ ] **Refletir status faseado dos demais domínios em ADR 0006.** Atualizar a seção "Histórico" do ADR conforme cada domínio receber seu PRD.

---

## Architecture Decision Records

- [ADR 0006 — Catálogo Canônico de Perfis Built-in (Framework RBAC)](../../docs/adr/0006-perfis-built-in-rbac.md) — Estrutura de quatro níveis por domínio com Gerente/Analista segregados e taxonomia de cinco categorias.
- [ADR 0007 — Domínio Transversal `acessos` Segregado do Super-Admin de Plataforma](../../docs/adr/0007-dominio-acessos-segregado.md) — Novo domínio com perfis Gestor e Consultor de Acessos para governança de assignments.
- [ADR 0008 — BFF como Gateway de Operações Cross-cutting](../../docs/adr/0008-bff-gateway-cross-cutting.md) — Filtro escopado de assignments + proxy de timeline de auditoria centralizados no BFF.
- [ADR 0009 — Mascaramento Server-Side de CPF via Permission-Aware Mapper](../../docs/adr/0009-cpf-masking-permission-aware-mapper.md) — Carve-out controlado em Cadastro com `ICurrentUserPermissions` + `DocumentoMasking`.

---

## Próximos Passos

1. **Implementação:** usar a skill `flow-task-creator` referenciando esta TechSpec para gerar as tarefas executáveis.
2. **Frontend:** caso uma TechSpec dedicada de frontend seja exigida, usar `flow-frontend-techspec-creator` referenciando o PRD; as decisões de gating e rotas já estão nesta TechSpec.
3. **Validação:** itens em "Questões em Aberto" devem ser resolvidos antes ou durante a implementação. O item de propagação de JWT é o único bloqueante real.
4. **Atualizar `docs/adr/README.md`** após aprovação dos ADRs.
