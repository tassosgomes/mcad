# Plano — Auditoria com Níveis de Classificação (L1 / L2 / L3)

> **Domínio:** Plataforma / Cross-cutting
> **Feature ID:** P-AUD-02
> **Status:** `draft`
> **Data:** 2026-05-15
> **Origem:** Conversa de design sobre como tornar a granularidade de auditoria explícita, governável e auditável por si só.

---

## 1. Contexto e ponto de partida

### 1.1 O que já existe no MCAD

| Componente | Estado |
|---|---|
| `audit_outbox` por serviço (Cadastro .NET, Identificacao .NET, Arrecadacao Java, Distribuicao Java) | ✅ funcionando, com poller publicando no RabbitMQ |
| Handlers de escrita emitindo `USER_ACTION` + `DATA_CHANGE` em todos os 4 BCs | ✅ 34 handlers instrumentados (`AUDITORIA-IMPLEMENTACAO.md`) |
| Headers HTTP de correlação (`X-Audit-Screen-Id`, `X-Audit-Screen-Name`, `X-Audit-Screen-Access-Id`, `X-Audit-Command-Id`, `X-Audit-Route`, `X-Audit-Session-Id`) extraídos por `HttpAuditContextProvider` em cada serviço | ✅ implementado |
| Frontend `frontend/src/features/auditoria` com 3 telas (Eventos / Acessos / Relatórios) consumindo `apiAuditoriaClient` | ✅ implementado |
| `ecad-authz` como serviço central de autorização (catálogo de permissões em 4 segmentos `dominio:area:recurso:acao`) | ✅ em produção (`docs/migracao-authz/relatorio-final.md`) |
| Catálogos por domínio em `docs/authz/catalog/*.md` (permissão → endpoint) | ✅ documentação viva |

### 1.2 O que **não** existe ainda

| Lacuna | Impacto |
|---|---|
| Catálogo de **telas** (não de permissões) com classificação de auditoria | Sem fonte de verdade do nível por tela |
| Token assinado de acesso a tela (SAT — *Screen Access Token*) carregando `scr`, `rid`, `lvl` | Sem prova criptográfica de que a navegação foi autorizada e classificada |
| Emissão de evento `SCREEN_ACCESS` pelo frontend | Telas que só consultam não geram trilha de quem visualizou o quê |
| Evento `DATA_ACCESS` (distinto de `DATA_CHANGE`) | Hoje só auditamos mutação, não leitura |
| Hash de payload em telas sensíveis (L3) | Impossível responder forense "o usuário viu *aquele* valor?" |
| Governança documentada para mudar nível de auditoria de uma tela | Risco de degradação silenciosa para L1 |

---

## 2. Modelo de classificação

Três níveis, declarados no catálogo de telas e propagados via SAT:

| Nível | Evento(s) gerado(s) | Uso |
|---|---|---|
| **L1 — Screen-only** | `SCREEN_ACCESS` na entrada | Dashboards agregados, telas de configuração pessoal, catálogos públicos |
| **L2 — Data access** | `SCREEN_ACCESS` + `DATA_ACCESS` por consulta (com `resourceId`) | Detalhe de obra, titular, captação, licença, UDA — default da plataforma |
| **L3 — Data access + hash** | L2 + `payloadHash` dos campos sensíveis no `DATA_ACCESS` | Rateios de distribuição, dados pessoais sob LGPD, valores financeiros |

Decisões já firmadas na conversa de design:

- **Default é L2.** PR exigido para baixar para L1, com `auditRationale` obrigatório.
- **Subir para L3 exige revisão da Segurança da Informação.**
- **L1 não significa "sem auditoria":** ainda emite `SCREEN_ACCESS`, só não emite `DATA_ACCESS`.
- O nível viaja no SAT (claim `lvl`), assinado, validade curta (5 min). Mudança no catálogo só vale para tokens novos.

---

## 3. Arquitetura alvo

```
┌──────────────┐   1. navega para /cadastro/obras/123                        ┌─────────────────┐
│   Frontend   │ ─────────────────────────────────────────────────────────► │  ecad-authz     │
│  (React SPA) │                                                            │   /v1/sat       │
│              │ ◄───────── 2. SAT { scr, lvl, rid, exp } ───────────────── │  (cataloga +    │
│              │                                                             │   assina)       │
│              │   3. POST /audit/screen-access (sempre, L1+)               └────────┬────────┘
│              │ ──────────────────────────────────────┐                              │
│              │                                       │                              │ catalog
│              │   4. GET /api/v1/obras/123            │                              ▼
│              │      Authorization: Bearer <JWT>      │                     ┌─────────────────┐
│              │      X-Audit-SAT: <SAT>               │                     │ Catálogo de     │
│              │ ─────────────────────────────────┐    │                     │ telas (yaml)    │
└──────────────┘                                  │    │                     │ em ecad-authz   │
                                                  ▼    ▼                     └─────────────────┘
                                       ┌──────────────────────┐
                                       │  Domain Service      │
                                       │ (cadastro/identific. │  5. valida SAT (sig + exp)
                                       │  /arrecad./distrib.) │     extrai scr, lvl, rid
                                       │                      │
                                       │  AuditSatMiddleware  │  6. se lvl >= L2:
                                       │                      │       emite DATA_ACCESS
                                       │                      │       (assíncrono via outbox)
                                       │                      │     se lvl == L3:
                                       │                      │       calcula hash do response
                                       └──────────┬───────────┘       e anexa ao evento
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │ audit_outbox →   │
                                         │ RabbitMQ →       │
                                         │ audit-service    │
                                         └──────────────────┘
```

---

## 4. Componentes a implementar

### 4.1 Catálogo de telas (em `ecad-authz`)

**Onde:** novo recurso `screens` no `ecad-authz`, paralelo a `permissions`. Arquivos versionados em Git no formato YAML.

**Schema mínimo:**

```yaml
# ecad-authz/catalog/screens/cadastro.yaml
screens:
  - screenId: cadastro:obra:detalhar
    path: /cadastro/obras/:id
    auditLevel: L2
    auditConfig:
      resourceExtractor: path.id
      captureFilters: false
    auditRationale: "Detalhe de obra exibe identificação e titularidades — dado nominal."
    permission: cadastro:default:obra:visualizar
    owner: tribo-cadastro
    lastReviewed: "2026-05-15"
    reviewedBy: arquitetura

  - screenId: cadastro:dashboard:home
    path: /cadastro
    auditLevel: L1
    auditRationale: "Métricas agregadas (>=5), sem exposição de identificação."
    permission: cadastro:default:dashboard:visualizar
    owner: tribo-cadastro
    lastReviewed: "2026-05-15"
    reviewedBy: seguranca-da-informacao

  - screenId: distribuicao:rateio:detalhar
    path: /distribuicao/rateios/:id
    auditLevel: L3
    auditConfig:
      resourceExtractor: path.id
      hashResponse: true
      hashFields: ["valorTotal", "titulares[].valor"]
    auditRationale: "Decisão financeira individualizada. Auditoria forense pode exigir prova do valor visto."
    permission: distribuicao:default:rateio:visualizar
    owner: tribo-distribuicao
    lastReviewed: "2026-05-15"
    reviewedBy: seguranca-da-informacao
```

**Endpoints a expor em `ecad-authz`:**

| Método | Path | Uso |
|---|---|---|
| `GET` | `/v1/screens` | Lista paginada do catálogo (BFF/admin) |
| `GET` | `/v1/screens/{screenId}` | Detalhe (debug) |
| `POST` | `/v1/sat` | Emite SAT — body: `{ screenId, resourceId? }` — retorna JWT assinado curto (5 min) |
| `GET` | `/v1/screens/report` | Relatório agregado para compliance (telas por nível, com `auditRationale`) |

**SAT (JWT compacto):**

```json
{
  "iss": "ecad-authz",
  "sub": "<userId>",
  "scr": "distribuicao:rateio:detalhar",
  "lvl": "L3",
  "rid": "rateio:2024-q3-789",
  "iat": 1747318800,
  "exp": 1747319100,
  "jti": "<uuid>"
}
```

Assinado com a mesma chave RS256 já usada pelo `ecad-authz` para outros tokens.

---

### 4.2 Frontend

**Novo módulo:** `frontend/src/shared/audit/` com:

- `useScreenAudit(screenId, resourceId?)` — hook que:
  1. Chama `POST /v1/sat` ao entrar na tela.
  2. Posta `POST /audit/screen-access` (sempre, mesmo L1).
  3. Guarda o SAT em estado (não localStorage) e fornece via context.
- `useAuthenticatedFetch()` — wrapper sobre fetch que, se houver SAT no context, adiciona `X-Audit-SAT` automaticamente em chamadas a APIs de domínio.
- `ScreenAuditBoundary` — componente wrapper aplicado pelo router via `routes.tsx`, lendo `screenId` da rota.

**Convenção de rota:** cada `Route` declara o `screenId` que casa com o catálogo:

```tsx
<Route
  path="/cadastro/obras/:id"
  element={<ScreenAuditBoundary screenId="cadastro:obra:detalhar"><ObraDetalhe /></ScreenAuditBoundary>}
/>
```

**Anti-padrão evitado:** o `auditLevel` *não* é lido no frontend. O frontend só sabe o `screenId`; o nível é uma decisão do `ecad-authz`.

---

### 4.3 Backend (cada serviço de domínio)

**.NET (Cadastro, Identificacao):**

- Novo `AuditSatMiddleware` em `Ecad.Audit.AspNetCore`:
  - Lê header `X-Audit-SAT`.
  - Valida assinatura contra JWKS do `ecad-authz` (mesmo do JWT do Logto).
  - Confere `exp`, `iss`, `sub` (deve casar com `sub` do JWT principal).
  - Popula `IAuditContext` com `screenId`, `auditLevel`, `resourceId`.
  - Em rotas `GET` com `auditLevel >= L2`: agenda `DATA_ACCESS` no outbox no `OnResultExecuted`.
  - Em `auditLevel == L3`: serializa response, calcula SHA-256 dos `hashFields` declarados, anexa ao evento.

**Java (Arrecadacao, Distribuicao):**

- `AuditSatFilter` em `audit-sdk-spring-boot-starter` espelhando o mesmo comportamento.
- Integração com `HttpAuditContextProvider` já existente — só estende o `AuditContext` record com `auditLevel` e `payloadHash`.

**Audit event payload — campos novos:**

```json
{
  "eventType": "DATA_ACCESS",
  "auditLevel": "L3",
  "screen": { "screenId": "...", "screenName": "..." },
  "resource": { "type": "rateio", "id": "2024-q3-789" },
  "payloadHash": {
    "algorithm": "sha256",
    "fields": ["valorTotal", "titulares[].valor"],
    "digest": "9f8a..."
  },
  ...
}
```

---

### 4.4 audit-service e UI

- Novo tipo de evento `DATA_ACCESS` em `AuditEventType`.
- Persistência: coluna `audit_level` (L1/L2/L3) + `resource_type`, `resource_id`, `payload_hash_json` em `audit_event`.
- API: filtro por `auditLevel`, `resourceId` no endpoint `/audit/screen-access` e novo `/audit/data-access`.
- UI (`frontend/src/features/auditoria`):
  - Badge de nível ao lado do `AuditEventTypeBadge`.
  - Tela `Relatórios` ganha modo "telas por nível" lendo `GET /v1/screens/report`.
  - Detalhe de evento L3 mostra `payloadHash` com tooltip explicando o uso forense.

---

### 4.5 Governança e CI

- Schema JSON Schema validando todo arquivo `catalog/screens/*.yaml` no CI do `ecad-authz`.
- Regras CI:
  1. Todo `screenId` referenciado em `routes.tsx` deve existir no catálogo (gera lista durante build do frontend e compara).
  2. Toda tela com `auditLevel: L1` exige `auditRationale` não vazio e `reviewedBy` preenchido.
  3. Toda tela com `auditLevel: L3` exige `auditConfig.hashFields` não vazio.
  4. `lastReviewed` mais antigo que 12 meses gera warning (relatório, não falha).
- PR template específico para mudanças em `catalog/screens/*` exigindo justificativa quando rebaixa nível.

---

## 5. Faseamento sugerido

| Fase | Escopo | Critério de pronto |
|---|---|---|
| **F0 — Catálogo + governança** | Estrutura YAML, JSON Schema, CI, sem efeito runtime ainda. Telas existentes inventariadas e classificadas (todas começam L2 ou L1). | `ecad-authz` aceita catálogo de telas, CI valida, inventário publicado em `docs/authz/catalog/screens.md` |
| **F1 — SAT mint** | `POST /v1/sat` no `ecad-authz`. Frontend chama no `ScreenAuditBoundary` e atribui em context. Backend valida mas não age. | Token emitido, frontend envia header, backend loga "SAT válido / inválido" |
| **F2 — L2 ponta-a-ponta em 1 BC** | Escolher **Identificacao** (menor volume de telas). Pipeline `SCREEN_ACCESS` + `DATA_ACCESS` funcionando. UI mostra. | Smoke test: navegar `/identificacao/captacoes/:id` gera 1 SCREEN_ACCESS + 1 DATA_ACCESS por consulta |
| **F3 — Rollout L2 nos demais BCs** | Cadastro, Arrecadacao, Distribuicao. | Todas as telas de detalhe em L2 emitem `DATA_ACCESS` |
| **F4 — L3 onde necessário** | Rateios de distribuição e dados financeiros de arrecadação. | Pelo menos 1 tela L3 com `payloadHash` validado em teste E2E |
| **F5 — Relatórios de compliance** | UI consolidada para auditor externo: telas por nível, `auditRationale`, última revisão. | Relatório exportável em CSV/PDF |

---

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `auditLevel` no SAT diverge do catálogo após mudança | Aceitar janela de 5 min até expirar; documentar como característica |
| Performance do hashing L3 em listas grandes | Hashing só de `hashFields` declarados, nunca payload inteiro; medir em load-test antes de promover telas a L3 |
| Catálogo divergir do roteador (rota renomeada sem atualizar `screenId`) | Teste CI que casa `routes.tsx` ↔ catálogo. Falha = bloqueia merge |
| Default virar L1 por preguiça (anti-padrão) | CI exige `auditRationale` para L1; PR template chama isso explicitamente |
| Dev esquece de declarar `screenId` na rota nova | `ScreenAuditBoundary` falha aberto em dev (warn), fechado em prod (404 do `/v1/sat` derruba navegação) |
| `resourceExtractor` quebrar silenciosamente quando `:id` é renomeado | Teste E2E por tela verifica que `resource.id` ≠ null no evento gerado |

---

## 7. Decisões pendentes (precisam confirmação antes de F0)

1. **Onde mora o catálogo de telas fisicamente?** Sugestão: dentro do repo `ecad-authz`, mesmo lugar dos catálogos de permissão. Alternativa: monorepo `mcad` em `docs/authz/catalog/screens/`.
2. **SAT compartilha chave de assinatura com o JWT do Logto, ou usa par próprio do `ecad-authz`?** Sugestão: par próprio do `ecad-authz` para isolar rotação.
3. **TTL do SAT.** Sugestão: 5 min (conforme conversa). Confirma?
4. **Vai existir `DATA_ACCESS` como tipo novo, ou reaproveitamos `SCREEN_ACCESS` com flag?** Sugestão: tipo novo, mantém retrocompatível com a UI atual.
5. **L3 é opcional na F4 ou bloqueia entrega da feature?** Sugestão: opcional; L3 nasce do primeiro caso real de compliance que pedir.

---

## 8. Próximos artefatos a produzir

Quando F0 for aprovado:

- `tasks/plataforma/prd-auditoria-niveis-classificacao/prd.md` — PRD formal.
- `tasks/plataforma/prd-auditoria-niveis-classificacao/techspec.md` — detalhamento técnico do SAT, middlewares, schema do catálogo.
- `tasks/plataforma/prd-auditoria-niveis-classificacao/N_task.md` — quebra em tasks executáveis.
- `docs/adr/0006-auditoria-niveis-classificacao.md` — ADR registrando a escolha de SAT + catálogo central.
