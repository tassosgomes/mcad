# QA Report - Login OIDC e tokens sem roles

**Task ID:** qa_task_01_login_tokens_env_qa
**Data/Hora:** 2026-05-30T21:20:13.285Z
**Status Geral:** PASS

## Contexto

- **User Story:** Validate .env_qa users can authenticate and receive tokens without business roles.
- **Ambiente:** https://mcad.tasso.dev.br
- **Tipos de teste:** UI / OIDC
- **Autenticacao:** Sim, Logto OIDC via browser
- **Banco:** Nao executado; qa_session.json indica database.enabled=false.
- **Sanitizacao:** Senhas, tokens, headers Authorization e codigos OAuth omitidos como [REDACTED].

## Casos de Teste

| ID | Descricao | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Login OIDC pela UI para cada usuario .env_qa | UI | PASS |
| CT-02 | Access token sem claims role/roles e sem escopo roles | UI/OIDC | PASS |
| CT-03 | Evidencias sanitizadas por usuario | Relatorio | PASS |

## Usuarios Testados

| Email | Username | Status | Final URL |
|-------|----------|--------|-----------|
| consultor.dev@mcad.local | consultor_dev | PASS | https://mcad.tasso.dev.br/cadastro/associacoes |
| operador.dev@mcad.local | operador_dev | PASS | https://mcad.tasso.dev.br/cadastro/associacoes |
| gerente.dev@mcad.local | gerente_dev | PASS | https://mcad.tasso.dev.br/cadastro/associacoes |
| analista_distribuicao@mcad.dev | analista_distribuicao | PASS | https://mcad.tasso.dev.br/cadastro/associacoes |
| gestor-acessos.dev@mcad.local | gestor_acessosdev | PASS | https://mcad.tasso.dev.br/cadastro/associacoes |
| consultor-acessos.dev@mcad.local | consultor_acessosdev | PASS | https://mcad.tasso.dev.br/cadastro/associacoes |
| admin_authz2@mcad.dev | admin_authz2 | PASS | https://mcad.tasso.dev.br/cadastro/associacoes |
| sem-papel.dev@mcad.local | sem_papel | PASS | https://mcad.tasso.dev.br/cadastro/associacoes |

## Detalhes por Usuario

### consultor.dev@mcad.local / consultor_dev - PASS

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** Comportamento esperado observado.
**Final URL:** https://mcad.tasso.dev.br/cadastro/associacoes

**Checks:**
- redirectedToLogto: PASS
- loginReturnedToApp: PASS
- authenticatedPageReached: PASS
- accessTokenObserved: PASS
- tokenIsJwt: PASS
- noRoleClaim: PASS
- noRolesClaim: PASS
- scopeHasNoRoles: PASS

**Token summary sanitizado:**
- issuer: https://9lcinu.logto.app/oidc
- audience: https://api.mcad.local
- subjectPresent: true
- scope: 
- role claim present: false
- roles claim present: false
- scope contains roles: false
- claim keys: aud, client_id, exp, iat, iss, jti, scope, sub

**Console do browser:**
```
Nenhuma mensagem de console capturada.
```

**Page errors:**
```
Nenhum pageerror capturado.
```

**Evidencias:**
- Screenshot: `screenshots/consultor_dev_01_logto_login.png`
- Screenshot: `screenshots/consultor_dev_02_authenticated.png`
- Video: `videos/consultor_dev.webm`
- Artifact JSON: `artifacts/consultor_dev.json`

### operador.dev@mcad.local / operador_dev - PASS

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** Comportamento esperado observado.
**Final URL:** https://mcad.tasso.dev.br/cadastro/associacoes

**Checks:**
- redirectedToLogto: PASS
- loginReturnedToApp: PASS
- authenticatedPageReached: PASS
- accessTokenObserved: PASS
- tokenIsJwt: PASS
- noRoleClaim: PASS
- noRolesClaim: PASS
- scopeHasNoRoles: PASS

**Token summary sanitizado:**
- issuer: https://9lcinu.logto.app/oidc
- audience: https://api.mcad.local
- subjectPresent: true
- scope: 
- role claim present: false
- roles claim present: false
- scope contains roles: false
- claim keys: aud, client_id, exp, iat, iss, jti, scope, sub

**Console do browser:**
```
Nenhuma mensagem de console capturada.
```

**Page errors:**
```
Nenhum pageerror capturado.
```

**Evidencias:**
- Screenshot: `screenshots/operador_dev_01_logto_login.png`
- Screenshot: `screenshots/operador_dev_02_authenticated.png`
- Video: `videos/operador_dev.webm`
- Artifact JSON: `artifacts/operador_dev.json`

### gerente.dev@mcad.local / gerente_dev - PASS

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** Comportamento esperado observado.
**Final URL:** https://mcad.tasso.dev.br/cadastro/associacoes

**Checks:**
- redirectedToLogto: PASS
- loginReturnedToApp: PASS
- authenticatedPageReached: PASS
- accessTokenObserved: PASS
- tokenIsJwt: PASS
- noRoleClaim: PASS
- noRolesClaim: PASS
- scopeHasNoRoles: PASS

**Token summary sanitizado:**
- issuer: https://9lcinu.logto.app/oidc
- audience: https://api.mcad.local
- subjectPresent: true
- scope: 
- role claim present: false
- roles claim present: false
- scope contains roles: false
- claim keys: aud, client_id, exp, iat, iss, jti, scope, sub

**Console do browser:**
```
Nenhuma mensagem de console capturada.
```

**Page errors:**
```
Nenhum pageerror capturado.
```

**Evidencias:**
- Screenshot: `screenshots/gerente_dev_01_logto_login.png`
- Screenshot: `screenshots/gerente_dev_02_authenticated.png`
- Video: `videos/gerente_dev.webm`
- Artifact JSON: `artifacts/gerente_dev.json`

### analista_distribuicao@mcad.dev / analista_distribuicao - PASS

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** Comportamento esperado observado.
**Final URL:** https://mcad.tasso.dev.br/cadastro/associacoes

**Checks:**
- redirectedToLogto: PASS
- loginReturnedToApp: PASS
- authenticatedPageReached: PASS
- accessTokenObserved: PASS
- tokenIsJwt: PASS
- noRoleClaim: PASS
- noRolesClaim: PASS
- scopeHasNoRoles: PASS

**Token summary sanitizado:**
- issuer: https://9lcinu.logto.app/oidc
- audience: https://api.mcad.local
- subjectPresent: true
- scope: 
- role claim present: false
- roles claim present: false
- scope contains roles: false
- claim keys: aud, client_id, exp, iat, iss, jti, scope, sub

**Console do browser:**
```
Nenhuma mensagem de console capturada.
```

**Page errors:**
```
Nenhum pageerror capturado.
```

**Evidencias:**
- Screenshot: `screenshots/analista_distribuicao_01_logto_login.png`
- Screenshot: `screenshots/analista_distribuicao_02_authenticated.png`
- Video: `videos/analista_distribuicao.webm`
- Artifact JSON: `artifacts/analista_distribuicao.json`

### gestor-acessos.dev@mcad.local / gestor_acessosdev - PASS

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** Comportamento esperado observado.
**Final URL:** https://mcad.tasso.dev.br/cadastro/associacoes

**Checks:**
- redirectedToLogto: PASS
- loginReturnedToApp: PASS
- authenticatedPageReached: PASS
- accessTokenObserved: PASS
- tokenIsJwt: PASS
- noRoleClaim: PASS
- noRolesClaim: PASS
- scopeHasNoRoles: PASS

**Token summary sanitizado:**
- issuer: https://9lcinu.logto.app/oidc
- audience: https://api.mcad.local
- subjectPresent: true
- scope: 
- role claim present: false
- roles claim present: false
- scope contains roles: false
- claim keys: aud, client_id, exp, iat, iss, jti, scope, sub

**Console do browser:**
```
Nenhuma mensagem de console capturada.
```

**Page errors:**
```
Nenhum pageerror capturado.
```

**Evidencias:**
- Screenshot: `screenshots/gestor_acessosdev_01_logto_login.png`
- Screenshot: `screenshots/gestor_acessosdev_02_authenticated.png`
- Video: `videos/gestor_acessosdev.webm`
- Artifact JSON: `artifacts/gestor_acessosdev.json`

### consultor-acessos.dev@mcad.local / consultor_acessosdev - PASS

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** Comportamento esperado observado.
**Final URL:** https://mcad.tasso.dev.br/cadastro/associacoes

**Checks:**
- redirectedToLogto: PASS
- loginReturnedToApp: PASS
- authenticatedPageReached: PASS
- accessTokenObserved: PASS
- tokenIsJwt: PASS
- noRoleClaim: PASS
- noRolesClaim: PASS
- scopeHasNoRoles: PASS

**Token summary sanitizado:**
- issuer: https://9lcinu.logto.app/oidc
- audience: https://api.mcad.local
- subjectPresent: true
- scope: 
- role claim present: false
- roles claim present: false
- scope contains roles: false
- claim keys: aud, client_id, exp, iat, iss, jti, scope, sub

**Console do browser:**
```
Nenhuma mensagem de console capturada.
```

**Page errors:**
```
Nenhum pageerror capturado.
```

**Evidencias:**
- Screenshot: `screenshots/consultor_acessosdev_01_logto_login.png`
- Screenshot: `screenshots/consultor_acessosdev_02_authenticated.png`
- Video: `videos/consultor_acessosdev.webm`
- Artifact JSON: `artifacts/consultor_acessosdev.json`

### admin_authz2@mcad.dev / admin_authz2 - PASS

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** Comportamento esperado observado.
**Final URL:** https://mcad.tasso.dev.br/cadastro/associacoes

**Checks:**
- redirectedToLogto: PASS
- loginReturnedToApp: PASS
- authenticatedPageReached: PASS
- accessTokenObserved: PASS
- tokenIsJwt: PASS
- noRoleClaim: PASS
- noRolesClaim: PASS
- scopeHasNoRoles: PASS

**Token summary sanitizado:**
- issuer: https://9lcinu.logto.app/oidc
- audience: https://api.mcad.local
- subjectPresent: true
- scope: 
- role claim present: false
- roles claim present: false
- scope contains roles: false
- claim keys: aud, client_id, exp, iat, iss, jti, scope, sub

**Console do browser:**
```
Nenhuma mensagem de console capturada.
```

**Page errors:**
```
Nenhum pageerror capturado.
```

**Evidencias:**
- Screenshot: `screenshots/admin_authz2_01_logto_login.png`
- Screenshot: `screenshots/admin_authz2_02_authenticated.png`
- Video: `videos/admin_authz2.webm`
- Artifact JSON: `artifacts/admin_authz2.json`

### sem-papel.dev@mcad.local / sem_papel - PASS

**Expected:** Login OIDC conclui, app renderiza pagina autenticada, token JWT nao contem role/roles nem escopo roles.
**Actual:** Comportamento esperado observado.
**Final URL:** https://mcad.tasso.dev.br/cadastro/associacoes

**Checks:**
- redirectedToLogto: PASS
- loginReturnedToApp: PASS
- authenticatedPageReached: PASS
- accessTokenObserved: PASS
- tokenIsJwt: PASS
- noRoleClaim: PASS
- noRolesClaim: PASS
- scopeHasNoRoles: PASS

**Token summary sanitizado:**
- issuer: https://9lcinu.logto.app/oidc
- audience: https://api.mcad.local
- subjectPresent: true
- scope: 
- role claim present: false
- roles claim present: false
- scope contains roles: false
- claim keys: aud, client_id, exp, iat, iss, jti, scope, sub

**Console do browser:**
```
Nenhuma mensagem de console capturada.
```

**Page errors:**
```
Nenhum pageerror capturado.
```

**Evidencias:**
- Screenshot: `screenshots/sem_papel_01_logto_login.png`
- Screenshot: `screenshots/sem_papel_02_authenticated.png`
- Video: `videos/sem_papel.webm`
- Artifact JSON: `artifacts/sem_papel.json`


## Resumo de Evidencias

- Plano: `test_plan.md`
- Request/response sanitizado: `requests.log`
- Screenshots: `screenshots/`
- Videos: `videos/`
- Artifacts sanitizados: `artifacts/`

## Informacoes para o Orquestrador

**Status final:** PASS
**Motivo:** Todos os usuarios autenticaram e os tokens avaliados nao contem role/roles nem escopo roles.
