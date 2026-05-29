# QA Report - qa_task_00 v4

**Task ID:** `qa_task_00_v4` (Preflight Setup e Dados - 2o redeploy distribuicao-api)
**Executor:** flow-qa-task-runner (4a execucao)
**Captura:** 2026-05-29T00:29Z a 00:33Z (BRT-3)
**Modo Playwright:** **HEADED** (`headless: false`, `slowMo: 200`, DISPLAY=:0)
**Status final:** **PARTIAL**

F4 RESOLVIDO neste redeploy (controller `/api/v1/processos` agora registrado e respondendo 200 com payloads validos). Porem F6 (catalogo upstream vazio) PERSISTE: `/rubricas` e `/processos/disponiveis` retornam ambos `[]`, impedindo qualquer seed de processo. Sem processo no banco, Etapas 2/3/4 (criar / calcular / aprovar / historico) ficam **bloqueadas por falta de dados-base**, nao mais por bug.

---

## 1. Sumario executivo

- **F4 (ProcessoController 404):** **RESOLVIDO.** O jar atual em producao tem o controller registrado. `GET /api/v1/processos` retorna 200, `GET /api/v1/processos/disponiveis` retorna 200, `POST /api/v1/processos` com payload sintetico retorna 422 com mensagem de dominio (`"Nao existe Rol de Execucoes fechado para rubrica 'TESTE' e periodo '2025-01'"`), confirmando que rota + Bean Validation + handler do dominio estao todos funcionais.
- **F5 (frontend bundle defasado):** **CONTINUA RESOLVIDO** (rota `/distribuicao/processos` renderiza para operador.dev sem fallback "Acesso negado").
- **F6 (catalogo upstream vazio):** **PERSISTE.** Sem rubricas (`/rubricas` = `[]`) e sem disponibilidades (`/processos/disponiveis` = `[]`), nao ha forma de seedar processos. Esta dependencia vem do contexto Arrecadacao (eventos `RolFechado` / `VerbaDisponivel` que materializam snapshots em distribuicao-api). Nenhum evento foi consumido ate agora.
- **Consequencia:** seed de processos via UI ou API impossivel. Etapas 2, 3 e 4 do roteiro NAO executaram (passos nao-aplicaveis). Aba "Historico de Alteracoes" continua `nao-verificado`.

---

## 2. Etapa 1 - Verificacao F4 (com Bearer valido)

Token capturado: `operador.dev`, fingerprint `...-zG5tM` (probe inicial), `...Xpt906` (probe seed). Tokens diferentes por sessao - cada login no Logto gera novo JWT.

### 2.1 Endpoints distribuicao-api direto

| Endpoint | HTTP | Body (resumo) |
|---|---|---|
| `GET /api/v1/processos` | **200** | `{"items":[],"totalElements":0,"totalPages":0}` |
| `GET /api/v1/processos/disponiveis` | **200** | `[]` |
| `GET /api/v1/rubricas` | **200** | `[]` |
| `GET /actuator/info` | **200** | `{}` (sem build-info ainda) |
| `GET /actuator/health` | **200** | `{"status":"UP","components":{"db":{...UP},"diskSpace":{...UP},"ping":{...UP},"rabbit":{...UP}}}` |
| `GET /actuator/mappings` | **404** | `"No static resource actuator/mappings"` (endpoint nao exposto na config Actuator) |
| `GET /v3/api-docs` | **404** | `"No static resource v3/api-docs"` (Springdoc nao habilitado) |

### 2.2 Endpoints via BFF (proxy)

| Endpoint | HTTP | Body |
|---|---|---|
| `GET /api/distribuicao/v1/processos` | 200 | `{"items":[],"totalElements":0,"totalPages":0}` |
| `GET /api/distribuicao/v1/processos/disponiveis` | 200 | `[]` |
| `GET /api/distribuicao/v1/rubricas` | 200 | `[]` |

### 2.3 Probe POST com payload sintetico (schema valido)

`POST /api/v1/processos` com `{"rubricaSigla":"TESTE","periodo":"2025-01"}`:

```
HTTP 422 Unprocessable Entity
{
  "type":"https://www.rfc-editor.org/rfc/rfc9457",
  "title":"Calculation Preconditions Failed",
  "status":422,
  "detail":"Nao existe Rol de Execucoes fechado para rubrica 'TESTE' e periodo '2025-01'",
  "instance":"/api/v1/processos"
}
```

Este 422 e a **prova definitiva** de que F4 esta resolvido:
1. Rota foi encontrada (nao mais 404 "No static resource").
2. Bean Validation passou (formato `^\d{4}-\d{2}$` aceito).
3. Handler `CriarProcessoCommandHandler.handle()` executou e abortou na linha 60 (`snapshotRolRepository.findByRubricaSiglaAndPeriodo(...)` retornou empty -> `BusinessException`).
4. `GlobalExceptionHandler` mapeou para ProblemDetail RFC 9457.

### 2.4 Build info / actuator/info

`/actuator/info` retorna `{}`. Spring Boot Maven plugin `build-info` goal continua nao configurado. **Bloqueio remanescente:** sem isso, nao temos como confirmar o git SHA do jar deployado nas proximas rodadas. Recomendacao para o orquestrador permanece.

### 2.5 actuator/mappings indisponivel

`/actuator/mappings` retorna 404 pois nao esta na lista `management.endpoints.web.exposure.include`. Apesar disso, o set completo de probes funcionais ja prova a presenca do controller, entao **nao bloqueante**.

Evidencias em `f4_verify_v4.json` e `criar_probe_valid_schema_v4.json`.

---

## 3. Etapa 2 - Seed de processos

**Nao executado** (zero processos criados).

Razao: `/processos/disponiveis` = `[]`, `/rubricas` = `[]`. Sem rubricas + snapshots no banco, qualquer `POST /api/v1/processos` (UI ou API direta) retorna 422 com `"Nao existe Rol de Execucoes fechado..."`.

| seq | id | status | observacao |
|---|---|---|---|
| 1 | (nenhum) | nao criado | sem disponibilidades |
| 2 | (nenhum) | nao criado | sem disponibilidades |
| synthetic | (nenhum) | 422 | probe com payload `TESTE/2025-01` para confirmar handler de dominio |

Screenshots:
- `screenshots/v4_processos_list.png` - lista de processos vazia para operador.dev
- `screenshots/v4_processo_criar_form.png` - formulario `/distribuicao/processos/novo` (sem opcoes no dropdown)

Detalhes em `seed_processos_v4.json`.

---

## 4. Etapa 3 - Aprovacao

**Nao executado** - depende de Etapa 2.

---

## 5. Etapa 4 - Aba Historico

**Nao verificado** - depende de processo aprovado. Status: `nao-verificado`.

---

## 6. Avaliacao consolidada de findings

| Finding | Status v1 | Status v2 | Status v3 | Status v4 | Detalhe |
|---|---|---|---|---|---|
| F1 - Catalogo authz vazio | aberto | resolvido | resolvido | resolvido | seed-authz + identity-sync OK |
| F2 - Identity sync stale | aberto | resolvido | resolvido | resolvido | usuarios receberam perfis |
| F3 - Logins flaky | aberto | resolvido | resolvido | resolvido | 6/6 perfis logam sem erro |
| F4 - ProcessoController 404 | aberto | aberto | aberto | **RESOLVIDO** | 2o redeploy publicou jar correto |
| F5 - Frontend bundle defasado | aberto | aberto | resolvido | resolvido | rotas renderizam para gerente/operador |
| F6 - Catalogo upstream vazio (rubricas/disponibilidades) | n/a | n/a | aberto | **persiste** | nenhum evento `RolFechado`/`VerbaDisponivel` materializado |

---

## 7. Bloqueios remanescentes para Fase 2

Sim - **parcialmente bloqueado**. Bloqueios:

- **Tasks que dependem de existencia de processo** (D04 detalhe/edicao/calcular/aprovar/finalizar/historico/RBAC sobre acoes do processo): **BLOQUEADAS** ate F6 ser resolvido. Recomendacao: orquestrador precisa garantir que arrecadacao-api publique eventos `RolFechado` e `VerbaDisponivel` consumiveis por distribuicao-api, OU inserir manualmente snapshots/rubricas via SQL no schema `distribuicao` (rota mais rapida para QA).
- **Tasks de read-only sobre listas vazias** (RBAC em listagem, header autenticacao, paginacao com zero itens): **OK** para prosseguir.
- **Tasks de RBAC sobre `/api/me`** e endpoints catalogo authz: **OK** para prosseguir (ja validados na v2).

---

## 8. Recomendacao para o orquestrador

Caminhos sugeridos (escolher um):

1. **Acionar arrecadacao-api para fechar Rol e disponibilizar Verba** em pelo menos 2 rubricas/periodos. Validar consumo pelos listeners `RubricaEventHandler`, `SnapshotRolEventHandler` (ou equivalente) em distribuicao-api antes de re-executar qa_task_00_v5.
2. **Seed direto via SQL** no schema `distribuicao`: inserir registros em `rubricas`, `snapshot_rol`, `snapshot_verba` para 2 combinacoes (rubricaSigla, periodo). Permite desbloquear QA sem depender da cadeia Arrecadacao->RabbitMQ->Distribuicao.
3. **Expor build-info** em `/actuator/info` (Spring Boot Maven plugin) e habilitar `management.endpoints.web.exposure.include=health,info,mappings` (ao menos em dev/QA) para futuras verificacoes.

Apos aplicado um dos caminhos acima, **qa_task_00_v5** focara apenas em: listar disponibilidades, criar 2 processos via UI, calcular, aprovar 1 como gerente, verificar aba historico.

---

## 9. Tempos e anomalias

| Operacao | Tempo (s) | Observacao |
|---|---|---|
| Login operador.dev (probe inicial) | ~18s | redirect OIDC + slowMo=200, esperado |
| Login operador.dev (probe seed) | ~17s | idem |
| `GET /processos` (direct) | 414 ms | 200 |
| `GET /disponiveis` (direct) | 422 ms | 200 [] |
| `GET /rubricas` (direct) | 264 ms | 200 [] |
| `POST /processos` (synth) | 694 ms | 422 (dominio) |
| `GET /processos` (BFF proxy) | 357 ms | 200 |

Anomalias UI: nenhuma. Front renderizou normalmente.

---

## 10. Credenciais e privacidade

- Sem credenciais escritas em evidencias.
- JWTs registrados apenas como fingerprint dos ultimos 6 chars (`...-zG5tM`, `...Xpt906`).
- Senhas nao impressas em stdout.

---

## 11. Arquivos produzidos nesta rodada

- `qa_report_task_00_v4.md` (este arquivo)
- `f4_verify_v4.json` (probes diretos para confirmar F4 resolvido)
- `seed_processos_v4.json` (tentativa de seed; documenta ausencia de disponibilidades)
- `criar_probe_valid_schema_v4.json` (POST sintetico para extrair erro de dominio 422)
- `screenshots/v4_processos_list.png`
- `screenshots/v4_processo_criar_form.png`

Runners utilizados:
- `/home/tsgomes/mcad/frontend/qa-preflight/run8_diag_v4.mjs` (diagnostico)
- `/home/tsgomes/mcad/frontend/qa-preflight/run9_seed_v4.mjs` (tentativa de seed)
- `/home/tsgomes/mcad/frontend/qa-preflight/run10_probe_v4.mjs` (probe POST sintetico)
