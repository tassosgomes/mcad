# ADR 0008 — BFF como Gateway de Operações Cross-cutting (Filtro Escopado + Audit Timeline)

- **Status:** Accepted
- **Data:** 2026-05-26
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** BFF, autorização, auditoria, integração

---

## Context

A entrega do framework de perfis built-in introduz duas operações que precisam de validação de permissão e composição de chamadas entre serviços, sem encaixar naturalmente em nenhum dos backends de domínio:

1. **Consulta escopada de assignments (RF-05 do PRD)** — o Gerente de um domínio precisa ver assignments envolvendo papéis do **seu domínio**, sem ver outros. Isso exige:
   - Ler os perfis do caller no contexto authz.
   - Derivar a lista de domínios em que ele é Gerente.
   - Chamar `ecad-authz` com filtro adequado.
   - Devolver lista filtrada ao frontend.
2. **Histórico de alterações de Processo (RF-03 do PRD)** — o Gerente de Distribuição abre uma aba que consulta o timeline do `ecad-auditoria`. Isso exige:
   - Validar a permissão `distribuicao:default:processo:ver-historico-alteracoes`.
   - Chamar `ecad-auditoria` `GET /entities/Processo/{id}/timeline`.
   - Devolver o resultado ao frontend.

Hoje, o BFF (Fastify/TypeScript em `services/bff/`) já é o gateway de autorização do frontend (`/api/me`, `/api/me/permissions` — ADR 0004), e o frontend usa essa camada para gating. Os backends de domínio não conhecem o conceito de "Gerente do meu domínio" — eles apenas verificam permissões individuais via `@RequiresPermission`/`RequirePermission`. Colocar a lógica de escopo em qualquer backend específico geraria replicação no Phase 3.

## Decision

Adotar o **BFF como gateway** para as duas operações:

### Endpoint 1: `GET /api/acessos/assignments`

Consultado pela tela de "Acessos do meu domínio" (Gerente) e por "Gestão de Acessos" (Gestor de Acessos).

**Fluxo:**

1. BFF resolve o `authorization-context` do caller via cache local + `ecad-authz` (caminho já existente).
2. BFF inspeciona as permissões do caller:
   - Se possui `acessos:default:papel:listar` (Gestor ou Consultor de Acessos), retorna **todos os assignments** sem filtro.
   - Caso contrário, extrai a lista de domínios em que ele tem `acessos:{dominio}:papel:visualizar`.
   - Se nenhum domínio, devolve 403.
3. BFF chama `ecad-authz` `GET /v1/users?...` com paginação e devolve uma lista enriquecida com os perfis do usuário, filtrada ao subset de domínios autorizados.
4. Headers padrão (`x-authz-version`, `x-correlation-id`) propagados.

### Endpoint 2: `POST /api/acessos/papeis/atribuir` e `DELETE /api/acessos/papeis/atribuir/{...}`

Wrapper sobre `POST /v1/users/{id}/roles` e `DELETE /v1/users/{id}/roles/{roleKey}` do `ecad-authz`. BFF valida que o caller tem `acessos:default:papel:atribuir`/`papel:remover` antes de proxar.

### Endpoint 3: `GET /api/distribuicao/processos/{id}/historico`

Consultado pela aba "Histórico de Alterações" do `ProcessoDetailPage` (Gerente).

**Fluxo:**

1. BFF resolve `authorization-context` (cache + ecad-authz).
2. BFF valida que o caller tem `distribuicao:default:processo:ver-historico-alteracoes`. Se não, 403.
3. BFF chama `ecad-auditoria` `GET /entities/Processo/{id}/timeline` propagando JWT (audit service decide se valida algo além disso).
4. BFF devolve o payload ao frontend, eventualmente com paginação local.

### Configuração

- Novas variáveis de ambiente no BFF:
  - `AUDIT_BASE_URL` (URL do `ecad-auditoria`).
  - `AUDIT_TIMEOUT_MS` (timeout default 5000).
- Cache do `authorization-context` permanece com TTL atual (`ME_CACHE_TTL_SECONDS`).
- Cache local de timeline **não é introduzido nesta entrega** — chamadas a `ecad-auditoria` são feitas por demanda.

## Alternativas Consideradas

### Alternativa 1: `ecad-authz` expõe endpoint de query escopada

- **Descrição:** Adicionar `?onlyDomains=...` em `GET /v1/users` e validar no próprio `ecad-authz` que o caller tem `acessos:{dominio}:papel:visualizar`.
- **Prós:** filtro na fonte; sem replicação de lógica no BFF.
- **Contras:** muda contrato do `ecad-authz` (requer PR no repo externo e bump de versão SDK).
- **Por que rejeitada:** acopla esta entrega ao roadmap do `ecad-authz`; PR externo não é prioridade no momento.

### Alternativa 2: Backend Distribuição expõe `/api/v1/processos/{id}/historico`

- **Descrição:** `distribuicao-api` cuida do endpoint de histórico, internamente chamando `ecad-auditoria`.
- **Prós:** mantém o "dono do dado" (Processo é entidade da Distribuição) como dono da rota; alinhado a Clean Architecture.
- **Contras:** cada domínio replicaria o padrão no Phase 3 (Cadastro precisa de `/api/v1/obras/{id}/historico`, etc.); duplica integração com `ecad-auditoria` em 4 serviços.
- **Por que rejeitada:** custo no Phase 3 não compensa o ganho semântico. O BFF é o lugar natural para integração com serviços auxiliares (audit, authz).

### Alternativa 3: Frontend chama `ecad-auditoria` diretamente

- **Descrição:** `frontend` chama `audit-service` direto via JWT.
- **Prós:** sem código intermediário.
- **Contras:** acoplamento alto entre frontend e topologia de serviços; CORS/URLs específicas; nenhuma camada onde aplicar validação de permissão composta (apenas o que o audit-service decidir).
- **Por que rejeitada:** quebra o padrão atual em que o frontend só conversa com BFF/APIs do mcad.

### Alternativa 4: Misto (BFF para Distribuição, backend Java para outros)

- **Descrição:** Padrão escolhido por domínio.
- **Prós:** flexibilidade.
- **Contras:** inconsistência arquitetural.
- **Por que rejeitada:** premissa do PRD é "framework replicável".

## Consequências

### Positivas

- BFF se confirma como ponto único de integração com `ecad-authz` e `ecad-auditoria` para o frontend mcad.
- Lógica de derivação de escopo (Gerente do domínio X) vive em um lugar só.
- Phase 3 (outros domínios) só precisa adicionar 1 endpoint de histórico no BFF (`/api/{dominio}/{entidade}/{id}/historico`), não em cada backend.
- BFF mantém o controle de cache, CORS, timeout e correlation IDs.

### Negativas

- BFF cresce em responsabilidade — passa de "proxy authz" para "gateway cross-cutting". Risco de virar god-object.
- Lógica de "qual domínio o Gerente vê" vive em código TypeScript, distante do catálogo authz que define as permissões — risco de drift se permissões mudarem.
- Backend de domínio NÃO é dono do endpoint de histórico — quebra parcial do princípio "Aggregate Root é dono dos seus dados".

### Riscos

- **Risco de god-object no BFF:** **Mitigação:** modularizar rotas por área (`acessosRoutes.ts`, `historicoRoutes.ts`), manter cobertura de testes alta.
- **Risco de drift de permissões:** se uma nova permissão `acessos:{dominio}:...` for adicionada, o BFF precisa saber dela. **Mitigação:** lista de domínios mcad é finita (4); derivar dinamicamente do contexto authz (qualquer permissão `acessos:{dominio}:papel:visualizar` vira "Gerente desse domínio").
- **Risco de timeout em audit:** `ecad-auditoria` é externo. **Mitigação:** `AUDIT_TIMEOUT_MS` com fallback 503 + retry exponencial limitado no frontend.

## Notas de Implementação

- Rotas novas registradas em `services/bff/src/acessosRoutes.ts` (novo) e `services/bff/src/historicoRoutes.ts` (novo).
- `server.ts` faz `await registerAcessosRoutes(...)` e `await registerHistoricoRoutes(...)`.
- `config.ts` valida `AUDIT_BASE_URL` na boot (obrigatória para o endpoint de histórico funcionar).
- Testes em `server.test.ts` (ou arquivos separados) cobrem: sem JWT → 401; sem permissão → 403; com permissão escopada → lista filtrada; com permissão completa → lista total; upstream timeout → 503.

## Referências

- PRD: `tasks/plataforma/prd-perfis-builtin-rbac/prd.md`
- TechSpec: `tasks/plataforma/prd-perfis-builtin-rbac/techspec.md`
- ADR 0004 — BFF expõe permissões para UX
- ADR 0006 — Catálogo canônico de perfis built-in
- ADR 0007 — Domínio transversal `acessos`
- `services/bff/src/meRoutes.ts` — modelo de proxy autorizado existente
