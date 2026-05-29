# QA Report — qa_task_00 (Pre-Flight)

- **PRD**: `tasks/plataforma/prd-perfis-builtin-rbac/prd.md`
- **TechSpec**: `tasks/plataforma/prd-perfis-builtin-rbac/techspec.md`
- **Executor**: QA Task Runner (skill: `flow-qa-task-runner`)
- **Data**: 2026-05-28
- **Ambiente**: DEV remoto — https://mcad.tasso.dev.br (front), https://mcad-bff.tasso.dev.br (BFF), https://mcad-authz.tasso.dev.br (ecad-authz via BFF proxy `/v1/...`)
- **Modo de execução**: Playwright `chromium`, **headless=true** (decisão registrada: WSL2 com `DISPLAY=:0`, mas headless é mais estável para 6 contextos paralelos sequenciais e suficiente para evidencias de fluxo).

## Status Final

**BLOCKED** — Pre-flight aborta com bloqueio sistemico. 4 de 6 usuarios nao estao provisionados no `ecad-authz`; 2 usuarios logam mas nao possuem assignments coerentes com o PRD; o **catalogo do PRD nao foi seedado em DEV** (nem roles, nem novas permissions, nem o dominio `acessos`). Nenhum dos casos de teste de qa_task_01..06 pode ser executado de forma significativa sem re-seed previo. Tentativa de auto-correcao via `gestor-acessos.dev` foi inviavel (proprio gestor nao provisionado) e via super-admin tambem (catalogo de roles vazio — nao ha o que atribuir).

## Resumo Executivo

1. Os 6 usuarios autenticam corretamente no Logto (todos recebem `id_token` com claim `roles` esperada — visivel nos `id_token_hint`s do `oidc/session/end`).
2. Quando o BFF chama `ecad-authz` para resolver o contexto de autorizacao, **4 usuarios (operador, gerente, gestor-acessos, consultor-acessos) recebem `401 INVALID_TOKEN — "Usuário não provisionado. Contate o administrador."`**. Isto e' o ecad-authz dizendo: "esse subject Logto nao existe na minha tabela de usuarios/assignments".
3. **consultor.dev** loga (200) mas tem **0 permissions** retornadas pelo `/api/me/permissions` — assignment nao existe em ecad-authz.
4. **analista.dev** loga (200) e tem **6 permissions** porem todas sao `authz:admin:*` (super-admin de plataforma de autorizacao); **nao** tem nenhuma permissao de `distribuicao:default:*` nem o esperado `cadastro:default:titular:ver-cpf-completo`.
5. Probe direto do catalogo `ecad-authz` via `/v1/permissions?domain=...` confirma: dominio `distribuicao` tem apenas as **9 permissoes baseline** (nenhuma das 10 novas do PRD — incluindo `processo:exportar`, `processo:ver-historico-alteracoes`, `credito:ver-historico-alteracoes`, `processo:recalcular-pos-calculado`, `credito-retido:liberar-manual`, `processo:ver-justificativa-cancelamento`, etc.); dominio `acessos` tem **0 permissoes** (nao existe); `cadastro:default:titular:ver-cpf-completo` (carve-out LGPD) **nao existe** no catalogo Cadastro (paginei todas as 82 chaves).
6. `/v1/roles` total **0 roles** no catalogo inteiro do ecad-authz DEV (`totalElements: 0`) — o servico esta com tabela de roles vazia. `/v1/users` total **0 users**. `/v1/user-roles` retorna **500 INTERNAL_ERROR**.

Em resumo: a base `ecad-authz` em DEV esta praticamente vazia — sem roles, sem usuarios, sem assignments, e sem as permissions novas do PRD. Esse e' o mesmo bloqueador "re-seed em DEV pendente" registrado no `qa_report.md` previo. Continua nao resolvido.

## Tabela de Login

| Usuario | Logto Auth | /api/me | /api/me/permissions | Perms count | Esperado | Match | Token fp |
|---|---|---|---|---|---|---|---|
| consultor.dev | 200 (id_token roles=`["distribuicao.default.consultor"]`) | 200 | 200 | **0** | `distribuicao.default.consultor` | ✗ (sem assignment) | `...GX9Q2W` |
| operador.dev | 200 (id_token roles=`["distribuicao.default.operador"]`) | **401 INVALID_TOKEN** | **401 INVALID_TOKEN** | n/a | `distribuicao.default.operador` | ✗ (nao provisionado) | `...9Qew6m` |
| gerente.dev | 200 (id_token roles=`["distribuicao.default.gerente"]`) | **401 INVALID_TOKEN** | **401 INVALID_TOKEN** | n/a | `distribuicao.default.gerente` | ✗ (nao provisionado) | `...2HHJom` |
| analista.dev | 200 (id_token roles=`["distribuicao.default.analista"]`) | 200 | 200 | **6** mas `authz:admin:*` | `distribuicao.default.analista` | ✗ (perfil divergente; tem super-admin) | `...DwPy5Q` |
| gestor-acessos.dev | 200 (id_token roles=`["acessos.default.gestor"]`) | **401 INVALID_TOKEN** | **401 INVALID_TOKEN** | n/a | `acessos.default.gestor` | ✗ (nao provisionado) | `...Nhv3ch` |
| consultor-acessos.dev | 200 (id_token roles=`["acessos.default.consultor"]`) | **401 INVALID_TOKEN** | **401 INVALID_TOKEN** | n/a | `acessos.default.consultor` | ✗ (nao provisionado) | `...YPT2dW` |

Mensagem completa do BFF em todos os 4 401s:

```json
{ "code": "INVALID_TOKEN", "message": "Usuário não provisionado. Contate o administrador." }
```

Decodificando os `id_token_hint` capturados na chamada `oidc/session/end` (publica), confirma-se que o Logto emite os roles corretos no token para todos os 6 usuarios. Ou seja, o problema **nao** e' na autenticacao nem nos claims; e' no provisioning em ecad-authz.

## Tabela de Atribuicoes Corrigidas

| Usuario | Acao tentada | Resultado |
|---|---|---|
| operador.dev | Atribuir `distribuicao.default.operador` via Gestor de Acessos (`/autorizacao/atribuicoes`) | **NAO TENTADA** — `gestor-acessos.dev` tambem nao esta provisionado. Caminho inviavel. |
| gerente.dev | idem | **NAO TENTADA** — mesmo motivo. |
| gestor-acessos.dev | idem | **NAO TENTADA** — paradoxo: tela e' acessada por ele mesmo. |
| consultor-acessos.dev | idem | **NAO TENTADA** — mesmo motivo. |
| Qualquer usuario | Auto-correcao via super-admin `analista.dev` (`authz:admin:*`) usando `/autorizacao/papeis` ou API direta `/v1/user-roles` | **INVIAVEL** — catalogo `/v1/roles` retorna `totalElements: 0`. Nao existe role para atribuir. |

**Conclusao**: nao ha caminho QA-only para corrigir as atribuicoes. O re-seed e' acao de codigo/operacional (rodar `./scripts/seed-authz.sh` apontando para DEV, ou equivalente).

## Processos Seedados (Distribuicao)

| Seq | ID | Status | Criador | Auditoria provavel? |
|---|---|---|---|---|
| — | — | — | — | — |

**Nenhum processo foi seedado.** O usuario `operador.dev` nao logou (BFF 401 INVALID_TOKEN), entao seu contexto nao chegou a `/distribuicao/processos`. Tentar com `analista.dev` (unico com `/api/me/permissions` retornando 200) tambem nao funcionaria porque ele nao tem `distribuicao:default:processo:criar` — suas 6 permissoes sao todas `authz:admin:*`.

## Probe do Catalogo ecad-authz (via BFF proxy `/v1/...` usando token de `analista.dev`)

Arquivo de evidencia: `authz_catalog_probe.json` e `cadastro_permission_keys.json`.

| Endpoint | Status | totalElements | Observacoes |
|---|---|---|---|
| `/v1/roles` | 200 | **0** | Catalogo de roles do ecad-authz **vazio em DEV** |
| `/v1/roles?domain=distribuicao` | 200 | 0 | Nem o role baseline existe |
| `/v1/roles?domain=acessos` | 200 | 0 | Dominio `acessos` nao foi criado |
| `/v1/permissions?domain=distribuicao` | 200 | **9** | Apenas baseline; **faltam 10 permissoes do PRD** (lista abaixo) |
| `/v1/permissions?domain=acessos` | 200 | **0** | Dominio inteiro nao foi seedado |
| `/v1/permissions?domain=cadastro` | 200 | 82 | Paginei todas; **`cadastro:default:titular:ver-cpf-completo` NAO esta presente** (carve-out LGPD do PRD nao aplicado) |
| `/v1/users` | 200 | **0** | Nenhum usuario provisionado |
| `/v1/user-roles` | **500** | n/a | `INTERNAL_ERROR`, correlationId `165ad8be-dd00-476e-906d-9157f3ce6bfe` — listagem de assignments quebrada |

### Permissoes baseline de Distribuicao presentes em DEV (9)
`distribuicao:default:{rubrica:listar, rubrica:visualizar, processo:listar, processo:visualizar, processo:criar, processo:calcular, processo:aprovar, processo:finalizar, processo:cancelar}`

### Permissoes do PRD AUSENTES em DEV (10+)
- `distribuicao:default:credito:listar`
- `distribuicao:default:credito:visualizar`
- `distribuicao:default:processo:exportar`
- `distribuicao:default:processo:ver-justificativa-cancelamento`
- `distribuicao:default:processo:recalcular-pos-calculado`
- `distribuicao:default:credito-retido:liberar-manual`
- `distribuicao:default:processo:ver-historico-alteracoes`  *(critica para US-03)*
- `distribuicao:default:credito:ver-historico-alteracoes`
- `distribuicao:default:demonstrativo:visualizar`
- `distribuicao:default:demonstrativo:exportar`
- `cadastro:default:titular:ver-cpf-completo`  *(critica para US-06 LGPD)*
- Todas as 7 permissoes do dominio `acessos`: `papel:{listar,visualizar,atribuir,remover}`, `usuario:{listar,visualizar-papeis-completo}`, `atribuicao:ver-historico`
- Permissoes escopadas `acessos:{dominio}:papel:visualizar` e `acessos:{dominio}:atribuicao:ver-historico` (RF-05)

## Observacoes / Comportamento Inesperado

1. **id_token vs access_token sao consistentes**: ambos carregam o role correto. O problema nao e' issuance do Logto — e' provisionamento em ecad-authz.
2. **`analista.dev` tem perfil divergente** do esperado: o PRD diz que ele deve ter `distribuicao.default.analista`, mas em DEV o `/api/me/permissions` mostra apenas `authz:admin:*` (super-admin de plataforma). Provavelmente uma atribuicao manual antiga via Logto custom data — note que ainda assim o ecad-authz retorna esses 6 permissions, sugerindo que ha **algum** caminho de sync funcional para ele (talvez via `identity-sync` consumindo o claim `roles` e mapeando para um perfil legado), mas o catalogo de roles do PRD nao foi aplicado.
3. **Tempos de operacao**: cada login completo (Logto + redirect + /api/me + /api/me/permissions) levou entre 9.9s e 16.6s. Nenhuma operacao excedeu 30s. Latencia do BFF nas chamadas `/api/me*`: 230ms (200) e 388-597ms (401). Sem instabilidade aparente — apenas falhas determinanticas de provisionamento.
4. **`/v1/user-roles` HTTP 500**: pode ser bug independente do ecad-authz quando a tabela esta vazia. Vale reportar separadamente. correlationId capturado.
5. **Headless**: rodei em headless mesmo com `DISPLAY=:0` disponivel — decisao tomada para maior estabilidade e velocidade; o objetivo (capturar fluxo, /api/me, screenshots) foi alcancado sem prejuizo.
6. **Auto-logout do app**: o frontend `AuthProvider` invoca `signinSilent` apos 401, falha, e dispara `signoutRedirect`. Isto explica porque a primeira tentativa do script v1 perdia a sessao apos o 401 — o v2 contorna usando `page.request` para chamar BFF diretamente com o token capturado.

## Bloqueios para Proximas Fases

Os seguintes itens **devem** ser resolvidos antes de qa_task_01..06:

1. **Re-seed do catalogo `ecad-authz` em DEV** com `seeds/mcad/roles.json` + `seeds/mcad/distribuicao.permissions.json` + `seeds/mcad/cadastro.permissions.json` + `seeds/mcad/assignments.json` na versao do PRD. Use `./scripts/seed-authz.sh` apontando para `https://mcad-authz.tasso.dev.br`. **(Sem isso, nenhuma permissao gateada por componente UI pode ser testada e nenhum 403 pode ser asseverado para o perfil correto.)**
2. **Provisionamento dos 6 usuarios** em `ecad-authz` (`/v1/users` e `/v1/user-roles`) ligando cada subjectId Logto ao role correto. **Sem isso, 4 usuarios continuam com 401 sistemico.**
3. **Investigar `/v1/user-roles` 500** (correlationId `165ad8be-dd00-476e-906d-9157f3ce6bfe`) — possivel bug independente em listagem de assignments.
4. **Decisao sobre `analista.dev` em DEV**: hoje ele tem `authz:admin:*` em vez de `distribuicao.default.analista`. Para os testes de US-02 funcionarem, e' preciso ou (a) atribuir o role correto + remover o super-admin, ou (b) criar um segundo usuario `analista.dev2` com o role correto. Recomendo (a) para fidelidade ao PRD.
5. (Pre-requisito de US-03 e US-04): a aba "Historico de Alteracoes" depende da integracao com `ecad-auditoria`. Mesmo apos re-seed, e' preciso confirmar que o BFF tem proxy ativo para `mcad-bff/api/auditoria/v1` (visto em `runtime-env.js`) e que ha eventos `USER_ACTION`/`DATA_CHANGE` para algum processo. **A criacao dos 2 processos de seed precisa ser refeita por `operador.dev` apos provisionamento, e a aprovacao por `gerente.dev` apos provisionamento.**

## Recomendacao para o Orquestrador

- **Nao avancar para a fase 2** (`qa_task_01`, `qa_task_02`, `qa_task_06`). Os 401 sistemicos e a ausencia de permissoes novas garantem que toda assercao da fase 2 (ex.: "Operador recebe 403 ao chamar `processo:aprovar`", "Analista nao ve aba Historico", "CPF mascarado para perfis sem `ver-cpf-completo`") sera trivialmente verdadeira por motivo errado (usuario nem provisionado), gerando "false-pass" enganoso.
- **Reabrir esta task** apos o re-seed e o provisionamento serem feitos (acoes de codigo/ops fora do escopo do QA).
- Se o usuario decidir prosseguir mesmo assim, a `phase 2` so podera produzir evidencia significativa para `qa_task_06` (CPF mascarado backend) usando `analista.dev` — porem confirma-se apenas que o backend Cadastro retorna CPF completo para super-admin; nao tera evidencia de mascaramento para perfis intermediarios sem provisionamento previo.

## Inventario de Artefatos

- `qa_report_task_00.md` (este arquivo)
- `preflight_results.json` — saida estruturada do script de 6 logins (status, perms count, fingerprint)
- `authz_catalog_probe.json` — resposta de `/v1/roles`, `/v1/permissions`, `/v1/users`, `/v1/user-roles`
- `cadastro_permission_keys.json` — todas as 82 chaves de Cadastro (paginadas) + filtro por `titular` + flag de existencia da nova permissao
- `me_<hint>.json` (6 arquivos) — saida redigida de `/api/me` + `/api/me/permissions` por usuario
- `requests.log` — log linha-a-linha de todas as chamadas HTTP observadas (Logto + BFF + ecad-authz proxy)
- `screenshots/login_<hint>.png` (6 arquivos) — screenshot final da home para cada usuario

Senhas, JWTs completos e e-mails completos NAO foram persistidos. Apenas fingerprints (ultimos 6 chars), email redigido (`xx***@dominio`) e subjectId truncado (`xxxx***xx`) aparecem nas evidencias.

---

```json
{
  "task_id": "qa_task_00",
  "status": "BLOCKED",
  "report_path": "tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados/qa_report_task_00.md",
  "users_logged_in_logto": ["consultor.dev", "operador.dev", "gerente.dev", "analista.dev", "gestor-acessos.dev", "consultor-acessos.dev"],
  "users_logged_in_bff": ["consultor.dev", "analista.dev"],
  "users_failed": [
    { "hint": "operador.dev",          "bff_status": 401, "code": "INVALID_TOKEN", "reason": "Usuário não provisionado em ecad-authz" },
    { "hint": "gerente.dev",           "bff_status": 401, "code": "INVALID_TOKEN", "reason": "Usuário não provisionado em ecad-authz" },
    { "hint": "gestor-acessos.dev",    "bff_status": 401, "code": "INVALID_TOKEN", "reason": "Usuário não provisionado em ecad-authz" },
    { "hint": "consultor-acessos.dev", "bff_status": 401, "code": "INVALID_TOKEN", "reason": "Usuário não provisionado em ecad-authz" }
  ],
  "users_with_wrong_role": [
    { "hint": "consultor.dev", "expected": "distribuicao.default.consultor", "observed_permissions_count": 0,                                            "note": "Loga OK mas /api/me/permissions retorna lista vazia (sem assignment)" },
    { "hint": "analista.dev",  "expected": "distribuicao.default.analista",  "observed_permissions_count": 6, "observed_role_inferred": "authz:admin",   "note": "Tem super-admin de plataforma authz, nao tem distribuicao:default:*" }
  ],
  "assignments_corrected": [],
  "seed_processos": [],
  "catalog_findings": {
    "authz_roles_total": 0,
    "authz_users_total": 0,
    "authz_user_roles_status": 500,
    "distribuicao_permissions_present": 9,
    "distribuicao_permissions_missing_from_prd": [
      "distribuicao:default:credito:listar",
      "distribuicao:default:credito:visualizar",
      "distribuicao:default:processo:exportar",
      "distribuicao:default:processo:ver-justificativa-cancelamento",
      "distribuicao:default:processo:recalcular-pos-calculado",
      "distribuicao:default:credito-retido:liberar-manual",
      "distribuicao:default:processo:ver-historico-alteracoes",
      "distribuicao:default:credito:ver-historico-alteracoes",
      "distribuicao:default:demonstrativo:visualizar",
      "distribuicao:default:demonstrativo:exportar"
    ],
    "acessos_domain_present": false,
    "cadastro_ver_cpf_completo_present": false
  },
  "blockers_para_proximas_tasks": [
    "Catalogo ecad-authz em DEV nao foi seedado com a versao do PRD (0 roles, dominio acessos ausente, 10 permissoes novas de distribuicao ausentes, permissao cadastro:default:titular:ver-cpf-completo ausente)",
    "4 dos 6 usuarios (operador.dev, gerente.dev, gestor-acessos.dev, consultor-acessos.dev) nao estao provisionados em ecad-authz: BFF responde 401 INVALID_TOKEN 'Usuário não provisionado'",
    "consultor.dev sem assignment efetivo (0 permissions) e analista.dev com role divergente (authz:admin:* ao inves de distribuicao.default.analista)",
    "/v1/user-roles retorna 500 INTERNAL_ERROR — possivel bug de listagem de assignments independente",
    "Sem catalogo seedado, gestor-acessos.dev (nem super-admin) tem caminho para corrigir assignments via UI — nao ha role disponivel para atribuir"
  ],
  "next_recommended_phase": "REOPEN qa_task_00 apos: (1) rodar ./scripts/seed-authz.sh contra DEV https://mcad-authz.tasso.dev.br com a versao do PRD; (2) provisionar os 6 subjects Logto em /v1/users + /v1/user-roles via seed ou via super-admin; (3) revalidar /api/me/permissions para todos. So entao avancar para a phase 2 (qa_task_01, qa_task_02, qa_task_06)."
}
```
