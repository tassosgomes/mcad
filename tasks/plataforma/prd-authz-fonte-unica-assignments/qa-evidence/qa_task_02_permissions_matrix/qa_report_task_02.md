# QA Report — Permissions Matrix .env_qa

**Task ID:** qa_task_02_permissions_matrix_env_qa  
**Data/Hora:** 2026-05-30T20:46:14.471Z  
**Status Geral:** PASS

---

## Contexto

- **User Story:** Validar /api/me e /api/me/permissions para cada usuario .env_qa.
- **Ambiente:** https://mcad.tasso.dev.br
- **Tipos de teste:** UI + API
- **Autenticacao:** OIDC Logto via browser
- **Banco:** Nao executado; database.enabled=false no qa_session.json.

---

## Casos de Teste

| ID | Usuario | /api/me | /api/me/permissions | Permissoes | Authz Version | Primary Role | Status |
|----|---------|---------|---------------------|------------|---------------|--------------|--------|
| CT-01 | admin_authz | 200 | 200 | 15 | 6 | - | PASS |
| CT-02 | admin_authz2 | 200 | 200 | 15 | 4 | - | PASS |
| CT-03 | analista_distribuicao | 200 | 200 | 102 | 7 | - | PASS |
| CT-04 | consultor_acessosdev | 200 | 200 | 5 | 2 | - | PASS |
| CT-05 | consultor_dev | 200 | 200 | 40 | 5 | - | PASS |
| CT-06 | gerente_dev | 200 | 200 | 16 | 2 | - | PASS |
| CT-07 | gestor_acessosdev | 200 | 200 | 7 | 2 | - | PASS |
| CT-08 | operador_dev | 200 | 200 | 9 | 2 | - | PASS |
| CT-09 | tsgomes | 200 | 200 | 47 | 5 | - | PASS |
| CT-10 | sem_papel | 200 | 200 | 0 | 1 | - | PASS |

---

## Detalhes por Caso

### CT-01 — admin_authz PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 15; authzVersion 6; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-01_admin_authz_app_after_login.png`

### CT-02 — admin_authz2 PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 15; authzVersion 4; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-02_admin_authz2_app_after_login.png`

### CT-03 — analista_distribuicao PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 102; authzVersion 7; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-03_analista_dev_app_after_login.png`

### CT-04 — consultor_acessosdev PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 5; authzVersion 2; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-04_consultor_acessos_dev_app_after_login.png`

### CT-05 — consultor_dev PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 40; authzVersion 5; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-05_consultor_dev_app_after_login.png`

### CT-06 — gerente_dev PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 16; authzVersion 2; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-06_gerente_dev_app_after_login.png`

### CT-07 — gestor_acessosdev PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 7; authzVersion 2; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-07_gestor_acessos_dev_app_after_login.png`

### CT-08 — operador_dev PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 9; authzVersion 2; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-08_operador_dev_app_after_login.png`

### CT-09 — tsgomes PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 47; authzVersion 5; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-09_tsgomes_app_after_login.png`

### CT-10 — sem_papel PASS

**Expected:** login OIDC, /api/me 2xx, /api/me/permissions com matriz efetiva; sem_papel com zero permissoes ou deny-safe.

**Actual:** /api/me HTTP 200; /api/me/permissions HTTP 200; permissionCount 0; authzVersion 1; primaryRole -.

**Evidencias:**
- Request/Response: `requests.log`
- Screenshot: `screenshots/ct-10_sem_papel_app_after_login.png`

---

## Resumo de Evidencias

```
qa_task_02_permissions_matrix/
├── test_plan.md
├── playwright.config.mjs
├── qa_task_02_permissions_matrix.spec.mjs
├── execution-results.json
├── requests.log
├── screenshots/
└── videos/
```

---

## Informacoes para o Orquestrador

**Status final:** PASS
**Motivo:** todos os perfis executados conforme esperado.
