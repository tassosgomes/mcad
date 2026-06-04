# QA Report - Acessos Operations

**Task ID:** qa_task_03_acessos_operations
**Data/Hora:** 2026-05-30T20:41:57Z
**Status Geral:** FAIL

---

## Contexto

- **User Story:** Validar operacoes read-only de Atribuicoes via BFF/UI.
- **Ambiente:** https://mcad.tasso.dev.br
- **BFF usado pelo frontend:** https://mcad-bff.tasso.dev.br
- **Tipos de teste:** UI + API
- **Autenticacao:** Sim, via Logto browser session.
- **Banco:** Nao aplicavel (`database.enabled=false`).

---

## Casos de Teste

| ID | Descricao | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Gestor de Acessos consulta operacoes read-only globais | UI + API | FAIL |
| CT-02 | Consultor de Acessos consulta operacoes read-only sem escrita | UI + API | NAO EXECUTADO |
| CT-03 | Usuario sem papel recebe negacao segura em Acessos | UI + API | NAO EXECUTADO |

---

## Detalhes por Caso

### CT-01 - Gestor de Acessos consulta operacoes read-only globais - FAIL

**Pre-condicao:** usuario gestor-acessos.dev autentica via Logto.

**Passos executados:**
1. Autenticacao no frontend MCAD.
2. Navegacao para `/autorizacao/atribuicoes`.
3. Captura de screenshot da tela.
4. Assertion de acessibilidade da rota.

**Expected:** a rota `/autorizacao/atribuicoes` deveria estar acessivel para Gestor de Acessos.

**Actual:** a rota carregou o shell autenticado com o perfil "Gestor de Acessos", mas exibiu o estado de negacao:

```text
Acesso negado. Voce nao tem permissao para acessar esta area.
```

**Erro capturado:**

```text
Error: CT-01 UI route expectation failed: expected accessible, accessible=false, denied=true
    at runTarget (.../qa_task_03_runner.mjs:249:13)
    at async main (.../qa_task_03_runner.mjs:296:22)
```

**Console do browser:** sem mensagens registradas no runner.

**Evidencias:**
- Screenshot UI: `screenshots/ct-01_gestor_acessos_dev_ui.png`
- Screenshot falha: `screenshots/ct-01_gestor_acessos_dev_fail.png`
- Video: `videos/page@1715d624de2715355114b48fee05b90b.webm`
- Resultado estruturado: `results.json`
- Log de requests: `requests.log`

**Nota:** Execucao interrompida apos esta falha, conforme gate anti-jeitinho. Os GETs read-only do CT-01 e os casos CT-02/CT-03 nao foram executados.

---

## Resumo de Endpoints Read-Only

| Usuario | Endpoint | Expected | Actual | Status |
|---------|----------|----------|--------|--------|
| gestor-acessos.dev | GET /api/acessos/usuarios | 200 | NAO EXECUTADO | BLOQUEADO por falha UI CT-01 |
| gestor-acessos.dev | GET /api/acessos/papeis | 200 | NAO EXECUTADO | BLOQUEADO por falha UI CT-01 |
| gestor-acessos.dev | GET /api/acessos/assignments | 200 | NAO EXECUTADO | BLOQUEADO por falha UI CT-01 |
| gestor-acessos.dev | GET /api/acessos/atribuicoes/historico | 200 | NAO EXECUTADO | BLOQUEADO por falha UI CT-01 |
| consultor-acessos.dev | GET /api/acessos/usuarios | 200 | NAO EXECUTADO | BLOQUEADO por CT-01 |
| consultor-acessos.dev | GET /api/acessos/papeis | 200 | NAO EXECUTADO | BLOQUEADO por CT-01 |
| consultor-acessos.dev | GET /api/acessos/assignments | 200 | NAO EXECUTADO | BLOQUEADO por CT-01 |
| consultor-acessos.dev | GET /api/acessos/atribuicoes/historico | 200 | NAO EXECUTADO | BLOQUEADO por CT-01 |
| sem-papel.dev | GET /api/acessos/usuarios | 403 | NAO EXECUTADO | BLOQUEADO por CT-01 |
| sem-papel.dev | GET /api/acessos/papeis | 403 | NAO EXECUTADO | BLOQUEADO por CT-01 |
| sem-papel.dev | GET /api/acessos/assignments | 403 | NAO EXECUTADO | BLOQUEADO por CT-01 |
| sem-papel.dev | GET /api/acessos/atribuicoes/historico | 403 | NAO EXECUTADO | BLOQUEADO por CT-01 |

---

## Resumo de Evidencias

```text
qa_task_03_acessos_operations/
├── test_plan.md
├── qa_task_03_runner.mjs
├── qa_report_task_03.md
├── requests.log
├── results.json
├── screenshots/
│   ├── ct-01_gestor_acessos_dev_ui.png
│   └── ct-01_gestor_acessos_dev_fail.png
└── videos/
    └── page@1715d624de2715355114b48fee05b90b.webm
```

---

## Informacoes para o Orquestrador

**Status final:** FAIL

**Motivo:** CT-01 falhou na validacao UI. O usuario gestor-acessos.dev autenticou, mas a rota `/autorizacao/atribuicoes` retornou estado visual de acesso negado.

**Falhas/blockers:**
- Nao foi possivel validar os endpoints read-only porque a falha ocorreu antes da etapa de chamadas BFF planejada para CT-01.
- CT-02 e CT-03 ficaram nao executados por interrupcao obrigatoria apos a primeira falha.
