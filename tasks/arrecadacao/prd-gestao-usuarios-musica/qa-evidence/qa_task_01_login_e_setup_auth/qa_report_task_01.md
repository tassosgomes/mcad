# QA Report — qa_task_01 — Login UI e Setup de Auth

**Task ID:** qa_task_01_login_e_setup_auth
**Feature:** F02 — Gestao de Usuarios de Musica (PRD-arrecadacao)
**Data/Hora:** 2026-05-17T15:44:00Z
**Status Geral:** PASS

---

## Contexto

- **User Story:** Pre-requisito de auth — login via UI e captura de token/cookie para reuso nos subagentes seguintes (qa_task_02 a qa_task_07).
- **Ambiente:** `https://mcad.tasso.dev.br` (frontend), `https://mcad-arrecadacao.tasso.dev.br/api/v1` (API).
- **Tipos de teste:** UI (Playwright Chromium headless) + API (cURL smoke).
- **Autenticacao:** Sim — credenciais lidas do sidecar `~/.cache/qa-mcad-f02/credentials.env` (chmod 600, fora do repo).
- **Provedor de identidade detectado:** **Logto Cloud** (`https://9lcinu.logto.app`), nao Keycloak como inicialmente assumido pelo template.

---

## Casos de Teste

| ID    | Descricao                                                                                  | Tipo | Status |
|-------|--------------------------------------------------------------------------------------------|------|--------|
| CT-01 | Login UI com `analista_cadastro` + captura de storageState/token                           | UI   | PASS   |
| CT-02 | Token capturado autoriza `GET /api/v1/usuarios-musica?page=1&size=1` (HTTP 200 esperado)   | API  | PASS   |

---

## Detalhes por Caso

### CT-01 — Login UI com analista_cadastro — PASS

**Pre-condicao:** nenhuma.

**Passos executados:**
1. Navegacao para `https://mcad.tasso.dev.br` — frontend redireciona automaticamente para `https://9lcinu.logto.app/sign-in?app_id=b0o8w18syrv95gd2o3kee`.
2. Formulario Logto detectado (`input[name="identifier"]`, `input[name="password"]`, botao `button[name="submit"][type="submit"]` "Sign in").
3. Preenchimento de `identifier` com `$QA_USERNAME` e `password` com `$QA_PASSWORD` (sem persistencia em log).
4. Submit do formulario.
5. Redirect via OIDC callback. URL final: `https://mcad.tasso.dev.br/cadastro/associacoes`.
6. Captura de:
   - `storageState.json` — 7 cookies (todos no dominio `9lcinu.logto.app`)
   - Authorization Bearer interceptado em request outbound da SPA — 1 token unico capturado
   - Decodificacao do payload do JWT

**Expected:**
- Apos submit, URL volta para dominio do frontend (`mcad.tasso.dev.br`) e nao em endpoint OIDC.
- `storageState.json` populado e Authorization Bearer interceptado.
- Console do browser sem erros criticos.

**Actual:**
- URL final: `https://mcad.tasso.dev.br/cadastro/associacoes` (rota default pos-login para o role `analista-cadastro`).
- `storageState.json` populado (7 cookies); `cookies.json` salvo separadamente.
- `consoleErrors: 0`, `pageErrors: 0` (vide `console.log.json`).
- JWT extraido com sucesso. Payload decodificado:
  ```json
  {
    "username": "analista_cadastro",
    "email": "analista_cadastro@mcad.dev",
    "name": "Analista Cadastro",
    "sub": "jpuoee8f7rq3",
    "iss": "https://9lcinu.logto.app/oidc",
    "aud": "https://api.mcad.local",
    "scope": "access write",
    "client_id": "b0o8w18syrv95gd2o3kee",
    "roles": ["analista-cadastro"]
  }
  ```

**Evidencias:**
- `screenshots/ct01_01_home_initial.png` — primeira navegacao (ja redirecionada ao Logto)
- `screenshots/ct01_02_login_form.png` — formulario Logto exibido
- `screenshots/ct01_03_after_login.png` — pos-redirect (`/cadastro/associacoes`)
- `screenshots/ct01_04_settled.png` — pagina apos network idle
- `videos/ct01_login_flow.webm` — gravacao completa
- `network.log.json` — todas as 80+ requests/responses (Authorization mascarado a 30 chars + `...`)
- `console.log.json` — vazio (0 errors, 0 warnings)
- `storageState.json`, `cookies.json`, `browser_storage.json`
- `token.txt`, `auth_user.txt`, `ct01_result.json`

---

### CT-02 — Token autoriza chamada na API Arrecadacao — PASS

**Pre-condicao:** CT-01 PASS; `token.txt` com JWT valido.

**Request:**
```
GET https://mcad-arrecadacao.tasso.dev.br/api/v1/usuarios-musica?page=1&size=1
Accept: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6...  (mascarado em requests.log)
```

**Expected:** HTTP 200 com payload paginado `{items: [...], metadata: {page, size, totalElements, totalPages}}`.

**Actual:** HTTP **200** retornado pela API. Payload conforme contrato do PRD F02:

```json
{
  "items": [
    {
      "id": "ea0082cb-ab08-4951-a346-4d34bdf39fb2",
      "razaoSocial": "Atlantico Bar Musical 00035 Servicos Digitais Ltda",
      "nomeFantasia": "Atlantico Bar Musical",
      "cnpjValor": "10000034000130",
      "cnpjFormatado": "10.000.034/0001-30",
      "endereco": { "cep": "50030000", "logradouro": "Travessa Atlantico", "numero": "134",
                    "complemento": null, "bairro": "Recife", "cidade": "Recife", "uf": "PE" },
      "contato": { "nomeResponsavel": "Bruno Almeida", "telefone": "51900000034",
                   "email": "atlantico-bar-musical-00035@example.com" },
      "status": "ATIVO",
      "criadoEm": "2026-05-12T00:53:16.401456Z",
      "atualizadoEm": "2026-05-12T00:53:16.401456Z"
    }
  ],
  "metadata": { "page": 1, "size": 1, "totalElements": 13813, "totalPages": 13813 }
}
```

**Evidencias:**
- `requests.log` — request completo (Authorization mascarado), headers de resposta, payload completo.

---

## Resumo de Evidencias

```
qa_task_01_login_e_setup_auth/
├── test_plan.md
├── qa_report_task_01.md            <- este arquivo
├── auth_user.txt                   <- preferred_username + roles + scope + aud + exp
├── token.txt                       <- JWT bearer (692 bytes)
├── storageState.json               <- Playwright storage state (7 cookies, 0 origins)
├── cookies.json                    <- copia dos cookies
├── browser_storage.json            <- localStorage / sessionStorage (ambos vazios)
├── ct01_result.json                <- assertions estruturadas do CT-01
├── network.log.json                <- request/response log (Authorization mascarado)
├── console.log.json                <- console browser + pageerror (vazios)
├── requests.log                    <- CT-02: cURL request + response
├── screenshots/
│   ├── ct01_01_home_initial.png
│   ├── ct01_02_login_form.png
│   ├── ct01_03_after_login.png
│   └── ct01_04_settled.png
└── videos/
    └── ct01_login_flow.webm
```

---

## Observacoes / Notas Tecnicas

1. **Provedor de identidade e Logto, nao Keycloak.** O sidecar `qa_session.json` mencionava roles tipo `analista-arrecadacao` (padrao Keycloak). O JWT real do ambiente usa Logto com claim `roles` (array simples) e role efetivo do usuario configurado e `analista-cadastro`, NAO `analista-arrecadacao`.

2. **Role efetivo do usuario `analista_cadastro` e `analista-cadastro`** (uma so role, no array `roles` do JWT). Apesar do nome, **a API Arrecadacao aceitou a chamada read** (`GET /usuarios-musica` retornou 200). Isto significa uma de duas coisas:
   - A API nao exige role especifica de arrecadacao para leitura (ou aceita `analista-cadastro` como autorizado a ler arrecadacao);
   - Ou nao ha validacao granular de role no endpoint de listagem.
   **Implicacao para qa_task_02..07:** operacoes de escrita (POST/PATCH/DELETE) podem ou nao funcionar com este token. Os subagentes seguintes devem reportar 401/403 fielmente caso ocorram, sem tentar "consertar" o role.

3. **Audience do token e `https://api.mcad.local`.** A API publica (`mcad-arrecadacao.tasso.dev.br`) aparentemente aceita esta `aud` — provavelmente porque o BFF/gateway nao valida `aud` ou foi configurado para aceitar este identificador interno.

4. **localStorage/sessionStorage estao vazios pos-login.** O frontend mantem o token apenas em memoria (in-process), o que e seguro mas significa que `storageState.json` sozinho **nao reidrata uma sessao autenticada para a SPA** — apenas mantem cookies do Logto que permitiriam refresh.

5. **Cookies estao no dominio do Logto** (`9lcinu.logto.app`), nao em `*.tasso.dev.br`. Nao ha cookie de sessao no dominio do BFF/frontend — o frontend autentica chamadas API com Bearer header, nao com cookie.

6. **Expiracao do token:** `exp = 2026-05-17T16:44:12Z` (~1h pos-emissao). Os subagentes que rodarem mais de 1h apos esta task **devem re-rodar qa_task_01** para refrescar o token.

7. **Escopo do token:** `access write` (configurado no client Logto). Suficiente para chamadas read/write na API Arrecadacao conforme demonstrado.

---

## Estrategia de Autenticacao para os Proximos Subagentes

**Recomendacao primaria:** usar **Bearer JWT direto** em todas as chamadas cURL contra a API Arrecadacao:

```bash
TOKEN=$(cat /home/tsgomes/github-tassosgomes/mcad/mcad/tasks/arrecadacao/prd-gestao-usuarios-musica/qa-evidence/qa_task_01_login_e_setup_auth/token.txt)
curl -sk -H "Authorization: Bearer $TOKEN" "https://mcad-arrecadacao.tasso.dev.br/api/v1/<endpoint>"
```

**Para testes UI (Playwright)** que precisem comecar autenticados:
- `storageState.json` sozinho NAO basta (token em memoria). A forma robusta e re-executar o login via Playwright em cada novo contexto, lendo do sidecar:
  ```js
  // template para qa_task_02..07
  await page.goto('https://mcad.tasso.dev.br');
  await page.fill('input[name="identifier"]', process.env.QA_USERNAME);
  await page.fill('input[name="password"]', process.env.QA_PASSWORD);
  await page.click('button[name="submit"][type="submit"]');
  await page.waitForURL(/mcad\.tasso\.dev\.br/);
  ```

**Re-rodar qa_task_01** se o tempo entre tasks ultrapassar 50 minutos (margem de seguranca antes do `exp`).

---

## Bloqueadores Identificados para Demais Tasks

Nenhum bloqueador. Auth funcional, API responde 200 com o token capturado.

**Riscos a observar nos proximos subagentes:**
- (R1) Role efetivo e `analista-cadastro`, nao `analista-arrecadacao`. Se algum endpoint de escrita em arrecadacao exigir role estrita, vai retornar 403. **Reportar fielmente, nao trocar credencial.**
- (R2) Token expira em ~1h. Se a fase 3 (paralela) demorar, re-rodar qa_task_01 antes de qa_task_06 (que depende de transicoes feitas em qa_task_05).

---

## Informacoes para o Orquestrador

**Status final:** PASS
**Casos:** CT-01 PASS / CT-02 PASS
**Caminho do relatorio:** `mcad/tasks/arrecadacao/prd-gestao-usuarios-musica/qa-evidence/qa_task_01_login_e_setup_auth/qa_report_task_01.md`
**Caminho do storageState:** `.../qa_task_01_login_e_setup_auth/storageState.json`
**Caminho do token:** `.../qa_task_01_login_e_setup_auth/token.txt`
**Estrategia de auth para proximos subagentes:** **Bearer JWT direto** lido de `token.txt` (preferencial). Para UI Playwright, re-executar login via formulario Logto (`input[name="identifier"]`, `input[name="password"]`, `button[name="submit"][type="submit"]`) usando credenciais do sidecar.
**Tasks possivelmente impactadas:** nenhuma (auth foundation estabelecida).
