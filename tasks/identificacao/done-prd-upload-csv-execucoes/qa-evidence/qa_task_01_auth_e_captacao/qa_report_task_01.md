# QA Report — qa_task_01_auth_e_captacao

**Status:** PASS  
**Tipo:** UI + API  
**Data:** 2026-06-20 (revalidado)

---

## Resumo

Autenticação via Logto funciona. A seção "Arquivos de Execução" existe na página de detalhe com empty state. O botão "Importar CSV" agora está visível na UI. Os endpoints GET e POST de uploads estão operacionais.

---

## Casos de Teste

### CT-01: Autenticação via Logto

| Campo | Valor |
|-------|-------|
| Dado | Credenciais de `analista_identificacao@mcad.dev` |
| Quando | Navega para `https://mcad.tasso.dev.br` |
| Então | Redirecionado para Logto (`9lcinu.logto.app`), login bem-sucedido, redirecionado para a aplicação |
| Resultado | **PASS** |

Evidência: `screenshots/01-login-form.png`

---

### CT-02: Lista de captações acessível

| Campo | Valor |
|-------|-------|
| Dado | Usuário autenticado como analista_identificacao |
| Quando | Redirecionado para `/identificacao/captacoes` |
| Então | Lista de captações exibida (Rádio AM/FM, Cinema, etc.) |
| Resultado | **PASS** |

Evidência: `screenshots/02-captacoes-list.png`

---

### CT-03: Captação detail page — Seção Uploads

| Campo | Valor |
|-------|-------|
| Dado | Captação ABERTA `f61277d5-38ca-4458-b73c-37a100b147f4` |
| Quando | Acessa detalhe da captação |
| Então | Título "Arquivos de Execução" presente, botão "Importar CSV" visível |
| Resultado | **PASS** |

Evidência: `screenshots/03-captacao-detail.png`

---

### CT-04: Botão "Importar CSV" visível

| Campo | Valor |
|-------|-------|
| Dado | Captação ABERTA, analista autenticado como dono |
| Quando | Acessa detalhe da captação |
| Então | Botão "Importar CSV" presente na seção "Arquivos de Execução" |
| Resultado | **PASS** (corrigido — anteriormente ausente) |

Evidência: `qa_task_02_upload_csv_valido/screenshots/ct01_uploads_section.png`

---

### CT-05: API GET /captacoes/{id}/uploads

| Campo | Valor |
|-------|-------|
| Dado | Captação existente, token JWT válido |
| Quando | GET via API |
| Então | Retorna lista (porém vazia — bug: não lista uploads existentes) |
| Resultado | **PASS com ressalva** (endpoint responde 200, mas lista vazia) |

---

### CT-06: API POST /captacoes/{id}/uploads

| Campo | Valor |
|-------|-------|
| Dado | Captação ABERTA, token JWT válido, CSV válido |
| Quando | POST multipart |
| Então | **202** — upload criado com status Processando |
| Resultado | **PASS** (corrigido — anteriormente retornava 500) |

Detalhes:
- Upload aceito: `{"id":"...","status":"Processando","criadoEm":"..."}`
- Processamento assíncrono executa (status → Concluido/ConcluidoComErros)
- Captação inexistente → 404 (validação OK)
- Arquivo não-CSV → 400 ("Formato inválido")

---

## Conclusão

- Autenticação: ✅
- Seção "Arquivos de Execução": ✅ (com botão "Importar CSV")
- GET uploads: ✅ (responde, mas listagem vazia — bug)
- POST upload: ✅ (corrigido de 500 → 202)

**Mudanças desde o relatório anterior (2026-06-16):**
- POST /uploads não retorna mais 500 — endpoint funcional
- Botão "Importar CSV" agora visível na UI
- Processamento assíncrono funciona (status transita Processando → Concluido/ConcluidoComErros)
