# Test Plan — qa_task_01 — Login UI e Setup de Auth

**Objetivo:** estabelecer a base de autenticacao do PRD F02 (Gestao de Usuarios de Musica).
Esta task NAO valida o fluxo de auth em casos negativos — apenas captura artefatos para
reuso pelos subagentes seguintes (qa_task_02 ... qa_task_07).

## Ambiente

| Item | Valor |
|---|---|
| Frontend | https://mcad.tasso.dev.br |
| BFF | https://mcad-bff.tasso.dev.br |
| API Arrecadacao | https://mcad-arrecadacao.tasso.dev.br/api/v1 |
| Usuario | `$QA_USERNAME` (sidecar `/home/tsgomes/.cache/qa-mcad-f02/credentials.env`) |
| Senha | `$QA_PASSWORD` (sidecar) |
| Role esperada | `analista-arrecadacao` |
| Browser | Chromium (Playwright via npx) |

## Saidas obrigatorias

- `storageState.json` — cookies + localStorage do contexto autenticado
- `token.txt` — JWT bearer (ou nota explicando que nao foi extraivel)
- `auth_user.txt` — `preferred_username` e roles extraidos do JWT
- `network.log.json` — log mascarado de requests/responses
- `requests.log` — log das chamadas cURL do CT-02
- `screenshots/*.png` e `videos/*.webm`

## Casos de teste

### CT-01 — Login UI com analista_cadastro

- **Tipo:** UI (Playwright Chromium headless)
- **Pre-condicao:** nenhuma
- **Passos:**
  1. Abrir `https://mcad.tasso.dev.br`
  2. Detectar fluxo de login (Keycloak hosted ou modal local)
  3. Preencher `username` e `password` (do sidecar)
  4. Submeter formulario
  5. Aguardar retorno ao dominio do frontend
  6. Inspecionar localStorage, cookies e requests outbound em busca do JWT
  7. Salvar `storageState.json`, `token.txt` e `auth_user.txt`
- **Expected:**
  - HTTP 200 na home apos o login
  - URL final em `mcad.tasso.dev.br` (e nao mais em Keycloak)
  - `storageState.json` populado
  - `token.txt` com JWT ou nota documentada (cookie-only)
  - Sem erros criticos no console
- **Evidencias:** screenshots da home, da tela de login, da tela pos-login; video da sessao

### CT-02 — Token capturado autoriza chamada na API Arrecadacao

- **Tipo:** API (cURL smoke)
- **Pre-condicao:** CT-01 PASS; token.txt com JWT valido
- **Request:**
  - `GET https://mcad-arrecadacao.tasso.dev.br/api/v1/usuarios-musica?page=1&size=1`
  - Header `Authorization: Bearer <jwt>`
- **Expected:** HTTP 200 com payload paginado (estrutura PRD F02)
- **Evidencias:** `requests.log` com request mascarado e response completo

### CT-02-ALT — (somente se JWT nao for extraivel) Cookie de sessao via BFF

- **Tipo:** API via BFF
- **Pre-condicao:** CT-01 PASS sem token extraivel
- **Request:**
  - `GET https://mcad-bff.tasso.dev.br/api/v1/arrecadacao/usuarios-musica?page=1&size=1`
  - Cookies do `storageState.json`
- **Expected:** HTTP 200

## Regras

- Senha NUNCA escrita em arquivo de evidencia
- `Authorization: Bearer ...` no `network.log.json` mascarado a 30 chars + `...`
- Se algum CT falhar, parar imediatamente e gerar relatorio FAIL
