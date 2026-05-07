# QA Report — qa_task_08_controle-acesso

**Status:** PASS
**Data:** 2026-04-10
**Tipo:** API

## User Story

Como sistema, quero garantir que apenas usuários com papel de analista possam executar operações de mudança de status, enquanto consultores recebem 403.

## Cenários Executados

### SC1 — Consultor POST /obras/{id}/liberar (espera 403)
- **Resultado:** PASS
- HTTP 403 (Forbidden)

### SC2 — Consultor POST /obras/{id}/bloquear (espera 403)
- **Resultado:** PASS
- HTTP 403 (Forbidden)

### SC3 — Consultor POST /obras/{id}/desbloquear (espera 403)
- **Resultado:** PASS
- HTTP 403 (Forbidden)

### SC4 — Consultor POST /fonogramas/{id}/liberar (espera 403)
- **Resultado:** PASS
- HTTP 403 (Forbidden)

### SC5 — Consultor POST /fonogramas/{id}/bloquear (espera 403)
- **Resultado:** PASS
- HTTP 403 (Forbidden)

### SC6 — Sem token POST /obras/{id}/liberar (espera 401)
- **Resultado:** PASS
- HTTP 401 (Unauthorized)

## Resultado Final

**PASS** — Todos os 6 cenários de controle de acesso passaram. O papel `analista` está corretamente separado do `consultor` para operações de mudança de status. Requisições sem token retornam 401.
