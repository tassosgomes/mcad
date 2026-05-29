# QA Report — qa_task_00 v2

**Task ID:** `qa_task_00_v2` (Preflight Setup e Dados — re-run pos-seed)
**Executor:** flow-qa-task-runner (2a execucao)
**Captura:** 2026-05-28T23:43Z a 23:49Z (BRT-3)
**Status final:** **PARTIAL** — logins OK para 6/6 usuarios com contagens de permissoes exatas; **seeding de processos BLOQUEADO** por bugs de ambiente fora do escopo do QA (Spring 404 do `ProcessoController` e gate de rota negando no front-end).

---

## 1. Sumario executivo

A v1 desta task retornou BLOCKED porque o catalogo `ecad-authz` em DEV nao tinha permissoes/papeis do PRD nem usuarios provisionados. Apos o setup feito pelo orquestrador (seeds de catalogo + papeis + provisionamento via identity-sync + assignments), esta v2 re-validou os 6 logins via Playwright + BFF (`/api/me` e `/api/me/permissions`) e tentou avancar para o seeding de 2 processos como `operador.dev` e a aprovacao de 1 como `gerente.dev`.

**Resultado:**

- **Logins (6/6 PASS)** — todos os usuarios autenticam no Logto, recebem token via BFF, e as contagens de permissoes coincidem **exatamente** com o esperado (40 / 9 / 16 / 102 / 7 / 5).
- **Seed de processos (BLOQUEADO)** — duas causas independentes:
  1. **Spring distribuicao deployado nao expoe `ProcessoController`** — `/api/v1/processos` e `/api/v1/processos/disponiveis` retornam **404 "No static resource"** mesmo com token valido (operador). Outros controllers do mesmo servico (ex: `/api/v1/rubricas`) respondem 200. Isso indica que o jar deployado em producao esta **desatualizado** (falta o bean do controller adicionado no commit `59c042e feat(distribuicao): F02 fase 2`).
  2. **Front-end nega `/distribuicao/*` mesmo com perms corretas** — `operador.dev`, `consultor.dev` e `analista.dev` (todos com `distribuicao:default:processo:listar` e/ou `distribuicao:default:rubrica:listar`) recebem a tela "Acesso negado. Voce nao tem permissao para acessar esta area." ao navegar para `/distribuicao/processos`. Esperar 6s pos-navegacao nao muda o resultado. Como o BFF retorna 200 com as perms corretas, isso sugere que o **bundle JS deployado esta defasado** ou que ha uma falha de hidratacao da query TanStack apos o redirect OIDC.
- **Aprovacao do processo (NAO EXECUTADA)** — depende do seed acima.

Findings F1/F2/F3 do setup permanecem documentados aqui como referencia mas nao bloquearam esta task.

---

## 2. Tabela de Login v2

Re-validacao via Playwright (headless) com chamadas `GET /api/me` e `GET /api/me/permissions` na sessao autenticada. Fonte: `preflight_results_v2.json`, `me_<hint>_v2.json`, `requests_v2.log`.

| Hint | Email | BFF /api/me | BFF /api/me/permissions | Count | Expected Count | Match | Tempo total login (ms) | JWT FP |
|---|---|---|---|---|---|---|---|---|
| consultor.dev | consultor.dev@mcad.local | 200 | 200 | 40 | 40 | YES | 16843 | ...1EBs7b |
| operador.dev | operador.dev@mcad.local | 200 | 200 | 9 | 9 | YES | 19583 | ...PiiK3V |
| gerente.dev | gerente.dev@mcad.local | 200 | 200 | 16 | 16 | YES | 14725 | ...NNXWCZ |
| analista.dev | analista_distribuicao@mcad.dev | 200 | 200 | 102 | 102 | YES | 16751 | ...x5I4Zl |
| gestor-acessos.dev | gestor-acessos.dev@mcad.local | 200 | 200 | 7 | 7 | YES | 15113 | ...-V6AuJ |
| consultor-acessos.dev | consultor-acessos.dev@mcad.local | 200 | 200 | 5 | 5 | YES | 12867 | ...353-GK |

**Observacoes:**

- Em **todos** os 6 casos `count_matches_expected = true` e `has_expected_permissions = true` (heuristica de prefixo dominio).
- Todos os tempos de login superam o threshold de 5s — esperado para chrome headless + redirect OIDC completo. Nenhum supera 20s.
- Comparado a v1, **5 dos 6 usuarios sairam de 401 "Usuario nao provisionado" para 200 com perms corretas**. Apenas `consultor.dev` e `analista.dev` ja passavam em v1 (com 0 e 6 perms respectivamente, agora 40 e 102) — confirmando que o identity-sync + assignments aplicados pelo orquestrador funcionaram conforme esperado.

Evidencias por usuario:
- `me_consultor.dev_v2.json` / `screenshots/login_consultor.dev_v2.png`
- `me_operador.dev_v2.json` / `screenshots/login_operador.dev_v2.png`
- `me_gerente.dev_v2.json` / `screenshots/login_gerente.dev_v2.png`
- `me_analista.dev_v2.json` / `screenshots/login_analista.dev_v2.png`
- `me_gestor-acessos.dev_v2.json` / `screenshots/login_gestor-acessos.dev_v2.png`
- `me_consultor-acessos.dev_v2.json` / `screenshots/login_consultor-acessos.dev_v2.png`

---

## 3. Processos seedados — BLOQUEADO

| seq | id | criado_em | status_pos_criacao | calculado_em | aprovado_em |
|---|---|---|---|---|---|
| 1 | (nenhum) | — | — | — | — |
| 2 | (nenhum) | — | — | — | — |

Nenhum processo foi criado. Duas tentativas:

### Tentativa A — UI como `operador.dev`

- Pagina `/distribuicao/processos` renderiza o componente `PermissionDeniedFallback` ("Acesso negado. Voce nao tem permissao para acessar esta area.") mesmo com 9 permissoes carregadas (`processo:listar`, `processo:criar`, etc).
- Esperar `networkidle + 6000ms` nao altera o estado.
- Screenshot: `screenshots/processo_seed_1_no_button.png`, `screenshots/processo_seed_2_no_button.png`, `screenshots/login_operador.dev_v2_postwait.png`.

### Tentativa B — API direta via BFF

- `POST https://mcad-bff.tasso.dev.br/api/distribuicao/v1/processos` — retorna **404** "No static resource api/v1/processos".
- `GET https://mcad-bff.tasso.dev.br/api/distribuicao/v1/processos/disponiveis` — retorna **404** "No static resource api/v1/processos/disponiveis".
- Diagnostico cruzado provando que o problema esta no upstream Spring, nao no BFF:
  - `GET https://mcad-distribuicao.tasso.dev.br/api/v1/processos` (upstream direto) — 404 (mesmo erro Spring "No static resource").
  - `GET https://mcad-distribuicao.tasso.dev.br/api/v1/rubricas` (upstream direto) — **200 [] (vazio)**.
  - `GET /actuator/health` — 200.
- Conclusao: `RubricaController` esta registrado; `ProcessoController` **NAO** esta registrado no jar/imagem em producao. O codigo-fonte do controller existe em `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/ProcessoController.java` (commit `59c042e`).

Evidencias da Tentativa B no log:
```
2026-05-28T23:45:32.002Z POST mcad-distribuicao.tasso.dev.br/api/v1/processos status=404 ...
2026-05-28T23:49:13.193Z GET  mcad-bff.tasso.dev.br/api/distribuicao/v1/processos/disponiveis status=404 ...
2026-05-28T23:49:13.463Z GET  mcad-bff.tasso.dev.br/api/distribuicao/v1/processos/disponiveis status=404 ...
```
(Ver `requests_v2.log` linhas 13-16.)

### Tentativa C — Aprovacao como `gerente.dev`

- Dependia de existir pelo menos 1 processo seedado. Como nenhum foi criado, a chamada `POST /processos/{id}/aprovar` nao foi executada.
- Login do gerente foi capturado com sucesso (16 perms, incluindo `processo:aprovar`).

---

## 4. Findings

### F1 (carregado do setup, informacional) — RF-05 escopadas rejeitadas pelo ecad-authz
Permissoes `acessos:{cadastro,identificacao,arrecadacao,distribuicao}:papel:visualizar` e variantes `:atribuicao:ver-historico` foram rejeitadas por `INVALID_PERMISSION_NAMESPACE` na fase de seed. A tela `/autorizacao/meu-dominio` provavelmente nao filtrara por dominio em testes subsequentes. **Nao bloqueia esta task.**

### F2 (carregado do setup, informacional) — 41 perms baseline de cadastro marcadas PERMISSION_DEPRECATED
Possivel impacto em testes futuros de `cadastro.default.consultor/analista`. **Nao bloqueia esta task.**

### F3 (carregado do setup, informacional) — `analista.dev` hint mapeia para email `analista_distribuicao@mcad.dev`
Confirmado: usado corretamente nos seis logins desta v2.

### F4 (NOVO — BLOCKER de ambiente) — ProcessoController ausente no Spring distribuicao deployado
- Severidade: **alta**
- Componente: `services/distribuicao-api` (servico Java Spring Boot em `mcad-distribuicao.tasso.dev.br`)
- Sintoma: `/api/v1/processos*` retorna 404 "No static resource" para qualquer rota declarada em `ProcessoController` (POST/GET/aprovar/finalizar/cancelar). `/api/v1/rubricas` responde 200, confirmando que o servico esta UP e que outros controllers funcionam.
- Causa provavel: imagem Docker em producao esta defasada em relacao ao codigo-fonte (commit `59c042e feat(distribuicao): F02 fase 2 - commands, queries, controller, frontend e testes`).
- Impacto QA: bloqueia tarefas que dependam de processos de distribuicao (US-03 historico de calculo/aprovacao, qualquer fluxo de operador/gerente/analista no dominio).

### F5 (NOVO — BLOCKER de ambiente) — Front-end nega `/distribuicao/*` mesmo com perms corretas
- Severidade: **alta**
- Componente: `frontend` (bundle `index-Ba960Adg.js` servido em `mcad.tasso.dev.br`)
- Sintoma: rota `/distribuicao/processos` renderiza `PermissionDeniedFallback` para tres usuarios distintos (`operador.dev`, `consultor.dev`, `analista.dev`) que TEM `distribuicao:default:processo:listar` (verificado em `me_<hint>_v2.json`).
- Diagnostico:
  - `GET /api/me/permissions` para o token desses usuarios retorna 200 com a lista correta.
  - Esperar 6s pos-navegacao nao desbloqueia o gate.
  - `RequirePermission anyOf={['distribuicao:default:rubrica:listar', 'distribuicao:default:processo:listar']}` em `frontend/src/app/router/routes.tsx:191` deveria permitir, ja que ambas perms estao presentes.
- Causa provavel: bundle JS deployado tem versao defasada do guard (formato singular `permission=` antigo, ou perms hard-coded como `authz:admin:...`), OU race condition da query TanStack apos redirect OIDC nao reidrata o `permissionsSet`.
- Impacto QA: bloqueia qualquer fluxo de UI no dominio distribuicao para QA visual via Playwright; ainda permite testes API se o backend funcionasse, mas F4 bloqueia o backend tambem.

### F6 (NOVO — informacional) — Rubricas vazias em DEV
- `GET /api/v1/rubricas` (upstream direto, autenticado) retorna `[]`.
- Sem rubricas seedadas o `ProcessoController.listarDisponiveis()` retornaria lista vazia mesmo se estivesse registrado (handler depende de `RubricaRepository`). Isso seria um segundo blocker se F4 fosse resolvido sozinho.

### F7 (NOVO — informacional) — Actuator/OpenAPI minimizados no Spring distribuicao
- `/actuator/mappings`, `/actuator/env`, `/v3/api-docs`, `/swagger-ui/*` retornam 404. Apenas `/actuator/health` e `/actuator/info` respondem 200. Isso dificulta o diagnostico runtime de quais controllers estao ativos.

---

## 5. Bloqueios para a Fase 2

| ID | Severidade | Bloqueia | Acao recomendada (fora do QA) |
|---|---|---|---|
| F4 | alta | qa_task que envolva criar/calcular/aprovar/finalizar/cancelar processos em distribuicao | Redeploy do `services/distribuicao-api` com binario incluindo `ProcessoController` (jar em sync com main). |
| F5 | alta | qa_task de UI em qualquer rota sob `/distribuicao/*` | Redeploy do `frontend` com bundle alinhado ao `routes.tsx` atual (anyOf), e/ou investigar race de TanStack Query no `PermissionsProvider`. |
| F6 | media | qa_task que dependa de processos com dados realistas (ex: calcular gerando creditos) | Seed de rubricas + verbas de teste em DEV apos F4. |
| F1 | baixa | qa_task US-05 (filtragem por dominio em `/autorizacao/meu-dominio`) | Resolver `INVALID_PERMISSION_NAMESPACE` no ecad-authz (escopo do setup). |

---

## 6. Recomendacao

**Fase 2 NAO deve iniciar para qa_tasks que exercitem fluxos do dominio distribuicao** (criar/calcular/aprovar processos, ver historico de credito, etc) ate F4 e F5 serem resolvidos.

**Fase 2 PODE iniciar** para:
- qa_tasks de auditoria que so dependam de login + leitura de `/api/me/permissions` (logins estao OK).
- qa_tasks de UI nos dominios `cadastro`, `identificacao`, `arrecadacao`, `auditoria`, `acessos`, `authz` (sidebar mostra as entradas corretas para `consultor.dev` e `analista.dev` nas screenshots).
- qa_tasks que validem o gate de permissao **per se** (mostrar acesso negado para usuarios sem perm — F5 mostra que o gate funciona "demais", e que para usuarios SEM a perm ele nega corretamente, conforme `gestor-acessos` e `consultor-acessos` em suas screenshots).

---

## 7. Evidencias produzidas

```
qa_task_00_preflight_setup_e_dados/
  qa_report_task_00.md               # v1 (arquivado)
  qa_report_task_00_v2.md            # ESTE
  preflight_results.json             # v1
  preflight_results_v2.json          # v2 — logins re-validados
  seed_processos.json                # v2 — vazio, com motivos
  requests.log                       # v1
  requests_v2.log                    # v2 — logs de TODAS as chamadas BFF e upstream
  me_consultor.dev.json              # v1
  me_consultor.dev_v2.json           # v2 (40 perms)
  me_operador.dev_v2.json            # v2 (9 perms)
  me_gerente.dev_v2.json             # v2 (16 perms)
  me_analista.dev_v2.json            # v2 (102 perms)
  me_gestor-acessos.dev_v2.json      # v2 (7 perms)
  me_consultor-acessos.dev_v2.json   # v2 (5 perms)
  screenshots/
    login_<hint>.png                 # v1
    login_<hint>_v2.png              # v2 (todos)
    login_operador.dev_v2_postwait.png   # v2 fixup com wait 6s
    processo_seed_{1,2}_no_button.png    # evidencia F5 no UI
    processo_calcular_{1,2}_no_button.png # evidencia F5 no UI
    processo_aprovado_no_button.png      # evidencia F5 no UI
```

Scripts adicionados (fora de qa-evidence, em `frontend/qa-preflight/`):
- `run3.mjs` — runner principal v2 (login + screenshot + tentativa seed via UI/API).
- `run4_seed.mjs` — fixup focado em seeding via API com endpoint correto.
- `run5_diag.mjs` — probes diagnosticas (provando F4 e F7).
