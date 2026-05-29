# QA Report — qa_task_00 v3

**Task ID:** `qa_task_00_v3` (Preflight Setup e Dados — pos-redeploy distribuicao-api + frontend)
**Executor:** flow-qa-task-runner (3a execucao)
**Captura:** 2026-05-29T00:07Z a 00:13Z (BRT-3)
**Modo Playwright:** **HEADED** (`headless: false`, `slowMo: 200`, DISPLAY=:0)
**Status final:** **PARTIAL** — smoke pos-redeploy do front passou (gerente acessa `/distribuicao/processos` sem "Acesso negado"), mas o seeding de processos continua **BLOQUEADO** pelo mesmo F4 da v2: `ProcessoController` ainda nao esta registrado no jar deployado em producao.

---

## 1. Sumario executivo

Esta v3 foi disparada apos o orquestrador reportar que o redeploy de `distribuicao-api` + frontend tinha sido realizado, com a expectativa de que F4 (ProcessoController 404) e F5 (frontend bundle defasado) estivessem resolvidos.

**Resultados:**

- **F5 (frontend) — RESOLVIDO.** `gerente.dev` foi capaz de carregar `/distribuicao/processos` sem o fallback "Acesso negado" (`v3_smoke_gerente.png`). `operador.dev` tambem nao foi mais bloqueado pelo gate de rota (ver `v3_operador_processos_list.png`).
- **F4 (distribuicao-api) — NAO RESOLVIDO.** Com token valido do `operador.dev`:
  - `GET /api/v1/processos` -> **404 "No static resource api/v1/processos"**
  - `GET /api/v1/processos/disponiveis` -> **404 "No static resource api/v1/processos/disponiveis"**
  - `GET /api/v1/rubricas` -> **200** (retorna `[]`, mas o controller esta registrado)
  - `GET /actuator/health` -> **200 UP**
- **Smoke check do orquestrador (`/api/v1/processos` -> 401 sem token) NAO contradiz o achado:** o filtro de auth Spring Security retorna 401 antes do DispatcherServlet, mascarando o fato de que a rota nao existe. Com Bearer valido, o Spring resolve para "No static resource", confirmando que o `RequestMapping("/api/v1/processos")` do `ProcessoController` nao foi registrado pelo container.
- **Consequencia:** disponibilidades nao podem ser listadas; processos nao podem ser criados; nenhuma calculo nem aprovacao foi possivel.
- **Aba Historico de Alteracoes:** `nao-verificado` — depende de existir processo aprovado.

---

## 2. Smoke check pos-redeploy

Testes de roteamento Spring (sem JWT e com JWT do operador.dev capturado da sessao Logto).

| Endpoint | Sem JWT (HTTP) | Com JWT operador (HTTP) | Body (com JWT) | Conclusao |
|---|---|---|---|---|
| `https://mcad-distribuicao.tasso.dev.br/api/v1/processos` | 401 | **404** | `{"type":"about:blank","title":"Not Found","status":404,"detail":"No static resource api/v1/processos."}` | Rota nao registrada |
| `https://mcad-distribuicao.tasso.dev.br/api/v1/processos/disponiveis` | 401 | **404** | `"No static resource api/v1/processos/disponiveis."` | Rota nao registrada |
| `https://mcad-distribuicao.tasso.dev.br/api/v1/rubricas` | 401 | **200** | `[]` | Controller OK |
| `https://mcad-distribuicao.tasso.dev.br/actuator/health` | 200 | 200 | `{"status":"UP","components":{"db":{"status":"UP",...}}}` | DB UP |
| `https://mcad-distribuicao.tasso.dev.br/actuator/info` | 200 | 200 | `{}` | Sem build-info exposto |
| `https://mcad-distribuicao.tasso.dev.br/actuator/mappings` | n/a | 404 | nao habilitado | — |
| `https://mcad-bff.tasso.dev.br/api/distribuicao/v1/processos` (proxy BFF) | 401 | **404** | mesma mensagem repassada | Upstream Spring |
| `https://mcad-bff.tasso.dev.br/api/distribuicao/v1/processos/disponiveis` | 401 | **404** | mesma mensagem repassada | Upstream Spring |
| `https://mcad-bff.tasso.dev.br/api/distribuicao/v1/rubricas` | n/a | 200 | `[]` | Proxy funciona |
| `https://mcad.tasso.dev.br` (front) | 200 | n/a | HTML | OK |

Evidencias completas em `diag_distribuicao_v3.json` e `requests_v3.log`.

**Diferenca em relacao a v2:** o smoke check antes do JWT (curl pelo orquestrador) reportou 401 (era 404). Isso ocorre porque sem token o Spring Security Filter Chain corta antes; com token o Spring tenta despachar e nao acha o handler. Portanto **o redeploy nao alterou o resultado final** — o jar atualmente em producao continua sem `ProcessoController`.

**Smoke front (gerente):** screenshot `v3_smoke_gerente.png` mostra a pagina `/distribuicao/processos` renderizando corretamente para `gerente.dev` (sem "Acesso negado"). Token capturado fingerprint `...FIgyCb`. Status route: **OK** (denied=false).

---

## 3. Processos seedados

| seq | id | criador | status | calculado_em | aprovado_em |
|---|---|---|---|---|---|
| 1 | (nenhum) | operador.dev | nao criado | — | — |
| 2 | (nenhum) | operador.dev | nao criado | — | — |

`GET /processos/disponiveis` -> 404. `disponiveis_count = 0` em `disponiveis_v3.json`. Nenhuma chamada de `POST /processos` foi tentada porque sem disponiveis o front nao permite e a API direta retornaria 404 tambem.

JSON final em `seed_processos_v3.json`:

```json
{
  "playwright_mode": "headed",
  "smoke": { "gerente_processos_route": "OK", "gerente_screenshot": "v3_smoke_gerente.png" },
  "disponiveis_count": 0,
  "seeds": [
    { "seq": 1, "id": null, "errors": ["Sem disponibilidades para criar processo"], "disp_count": 0 },
    { "seq": 2, "id": null, "errors": ["Sem disponibilidades para criar processo"], "disp_count": 0 }
  ],
  "calcs": [],
  "approval": null,
  "aba_historico_aparece_para_gerente": "nao-verificado"
}
```

---

## 4. Screenshots produzidos

| Arquivo | Conteudo |
|---|---|
| `screenshots/v3_smoke_gerente.png` | `gerente.dev` em `/distribuicao/processos` — pagina renderiza, sem "Acesso negado" |
| `screenshots/v3_operador_processos_list.png` | `operador.dev` em `/distribuicao/processos` — tambem renderiza (F5 resolvido) |
| `screenshots/v3_processo_criar_1.png` | `operador.dev` em `/distribuicao/processos/novo` — formulario sem disponiveis |

Screenshots de `processo_criado`, `processo_calculado`, `processo_aprovado` **nao foram gerados** porque nenhum processo pode ser criado.

---

## 5. Tempos e anomalias

| Operacao | Tempo (s) | Observacao |
|---|---|---|
| Login gerente.dev (smoke) | ~16s | redirect OIDC + slowMo=200, esperado |
| Login operador.dev | ~17s | idem |
| Login gerente.dev (aprovacao) | ~14s | idem |
| `GET /processos/disponiveis` (BFF) | 461ms | 404 |
| `GET /processos/disponiveis` (direct) | 333ms | 404 |
| `GET /rubricas` (direct) | <1s | 200 [] |

Anomalias UI: nenhuma. O front renderizou corretamente em ambos os perfis. O bug e estritamente backend.

---

## 6. Avaliacao de F4 / F5

| Finding | Status v2 | Status v3 | Detalhe |
|---|---|---|---|
| F4 — `ProcessoController` 404 | aberto | **persiste** | jar deployado nao tem o controller; commit `59c042e` nao chegou na imagem em producao |
| F5 — frontend bundle defasado | aberto | **resolvido** | gerente e operador navegam para `/distribuicao/processos` sem o gate "Acesso negado" |

Hipotese F4: o pipeline de build/deploy de `distribuicao-api` nao publicou o jar mais recente apos o redeploy (cache de imagem, tag stale, ou pull-policy). Nao ha `build-info` em `/actuator/info` para confirmar o git SHA do binario.

---

## 7. Bloqueios para Fase 2

Sim — **bloqueado**. Nenhuma task de Fase 2 que dependa de:
- existencia de processo (D04 distribuicao detalhe/edicao/calcular/aprovar)
- catalogo de disponibilidades
- fluxo end-to-end de processo (criar -> calcular -> aprovar -> finalizar)
- auditoria via aba "Historico de Alteracoes"

...pode ser executada ate F4 ser corrigido. Tasks de leitura pura (listas vazias, rubricas, snapshots) e de RBAC sobre `/api/me` podem prosseguir.

---

## 8. Recomendacao para o orquestrador

1. Validar via DevOps que o redeploy de `distribuicao-api` publicou o commit `59c042e` (ou mais recente). Verificar:
   - tag/digest da imagem Docker em uso no swarm
   - se `META-INF/spring.factories` ou auto-config do Spring esta excluindo `ProcessoController`
   - logs de startup do servico para "Mapped /api/v1/processos"
2. Expor `build-info` em `/actuator/info` (Spring Boot Maven plugin `build-info` goal) para evidenciar a versao deployada nas proximas rodadas.
3. Apos correcao, **reexecutar qa_task_00_v4** focado apenas em seed + calcular + aprovar (logins ja sao PASS estavel).

---

## 9. Credenciais e privacidade

- Sem credenciais escritas em arquivos de evidencia.
- JWTs sao registrados apenas como fingerprint dos ultimos 6 chars (`...mo-47c`, `...V7__3p`, `...FIgyCb`, `...DhgcF0`).
- Senhas e tokens nao foram impressos em stdout nem persistidos.

---

## 10. Arquivos produzidos nesta rodada

- `qa_report_task_00_v3.md` (este arquivo)
- `seed_processos_v3.json`
- `disponiveis_v3.json`
- `diag_distribuicao_v3.json`
- `requests_v3.log`
- `screenshots/v3_smoke_gerente.png`
- `screenshots/v3_operador_processos_list.png`
- `screenshots/v3_processo_criar_1.png`

Runner: `/home/tsgomes/mcad/frontend/qa-preflight/run6_seed_v3.mjs` (seed) e `/home/tsgomes/mcad/frontend/qa-preflight/run7_diag_v3.mjs` (diagnostico).
