# QA Report: Task 01 — Login e Autenticação (analista_arrecadacao)

**Task ID:** `qa_task_01`  
**Slug:** `login`  
**PRD:** F04 — Registro de Pagamentos  
**Executado em:** 2026-06-10  
**Executor:** QA Task Runner (subagente)  
**Status Final:** ✅ **PASS**

---

## Contexto

- **Base URL:** `https://mcad.tasso.dev.br`
- **Auth Provider:** LogTo (OIDC)
- **Credenciais:** `analista_arrecadacao` / `Analista123!`
- **Role esperada:** `analista-arrecadacao`

---

## Casos de Teste

### CT-01: Login via UI com credenciais válidas de analista_arrecadacao

**Passos executados:**
1. Navegou para `https://mcad.tasso.dev.br`
2. Identificou sessão anterior ativa; clicou em **Sair** para garantir teste limpo
3. Clicou em **Entrar novamente**
4. Redirecionado para LogTo (`https://9lcinu.logto.app/sign-in`)
5. Preencheu username: `analista_arrecadacao`
6. Preencheu password: `Analista123!`
7. Clicou em **Sign in**
8. Redirecionado para `/callback?code=...&state=...&iss=...`
9. Após callback, redirecionado para `/arrecadacao/usuarios-musica`

**Resultado:**
- ✅ Redirecionamento para dashboard/home (Usuários de Música)
- ✅ Token JWT obtido via `POST /oidc/token` (200 OK)
- ✅ Usuário logado como **Analista Arrecadação** (`arrecadacao.default.analista`)

**Evidências:**
- Screenshot: [`screenshots/ct01_logto_signin.png`](screenshots/ct01_logto_signin.png)
- Screenshot: [`screenshots/ct01_login_success.png`](screenshots/ct01_login_success.png)
- Network request: [`network_token_request.txt`](network_token_request.txt)
- Network response: [`network_token_response.txt`](network_token_response.txt)

---

### CT-02: Navegação para o módulo Arrecadação após login

**Passos executados:**
1. No sidebar, clicou em **Pagamentos** (link: `/arrecadacao/pagamentos`)
2. Aguardou carregamento da página

**Resultado:**
- ✅ Página de **Pagamentos** carregou com sucesso
- ✅ Status HTTP 200 na API `GET /api/arrecadacao/v1/pagamentos`
- ✅ Sem erro 403 ou mensagem de acesso negado
- ✅ Tabela de pagamentos renderizada com dados (usuário, rubrica, período, qtd UDAs, valor R$, status, ações)

**Evidências:**
- Screenshot: [`screenshots/ct02_modulo_pagamentos.png`](screenshots/ct02_modulo_pagamentos.png)
- Network log: [`network_requests.log`](network_requests.log)

---

## Observações

1. **Glitch 503 (não crítico):**
   - Durante o redirecionamento pós-login, a primeira chamada `GET /api/arrecadacao/v1/usuarios-musica` retornou **503**.
   - Imediatamente após, uma segunda chamada idêntica retornou **200**.
   - Isso não impediu o login nem a navegação. Pode ser um glitch temporário do backend/BFF.

2. **Console do browser:**
   - Um único erro de console: `Failed to load resource: 503` referente ao endpoint acima.
   - Nenhum erro JavaScript ou warning adicional.
   - Log completo: [`browser_console.log`](browser_console.log)

---

## Resumo

| Caso | Descrição | Status |
|------|-----------|--------|
| CT-01 | Login via UI com credenciais válidas de analista_arrecadacao | ✅ PASS |
| CT-02 | Navegação para o módulo Arrecadação (Pagamentos) | ✅ PASS |

**Conclusão:** A autenticação com `analista_arrecadacao` funciona corretamente via LogTo. O usuário consegue acessar o módulo de Arrecadação e a página de Pagamentos sem restrições de autorização. Próximas tasks (UDA, pagamentos, etc.) podem ser executadas com a sessão estabelecida.
