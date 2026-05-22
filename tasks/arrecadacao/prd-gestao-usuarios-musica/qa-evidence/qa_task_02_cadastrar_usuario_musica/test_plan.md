# Test Plan — qa_task_02 — Cadastrar Usuario de Musica (HU-01)

**Feature:** F02 - Gestao de Usuarios de Musica
**User Story:** HU-01 (RF-01, RF-02, RF-03, RF-06, RF-07)
**Data/Hora inicio:** 2026-05-17 (post qa_task_01)

## Ambiente

- **API Arrecadacao:** `https://mcad-arrecadacao.tasso.dev.br/api/v1`
- **Frontend:** `https://mcad.tasso.dev.br`
- **Auth:** Bearer JWT lido de `qa_task_01_login_e_setup_auth/token.txt`
- **Role efetivo do usuario:** `analista-cadastro` (vide qa_task_01) - pode rejeitar escrita com 401/403.
  Se rejeitar, registrar FAIL fielmente e nao trocar de usuario.

## CNPJs gerados (modulo 11 RFB)

Sufixo timestamp base: `1779032913` (epoch da geracao).

| CT    | CNPJ            | Tipo        | Valido | Uso                              |
|-------|-----------------|-------------|--------|----------------------------------|
| CT-01 | 99790329130021  | numerico    | sim    | happy path numerico              |
| CT-02 | 12ABC34501DE35  | alfanumerico| sim    | happy path alfanumerico RFB      |
| CT-03 | 99790329130022  | numerico    | NAO    | DV invalido (CT-01 +1 no ultimo) |
| CT-04 | 99790329130021  | numerico    | sim    | duplicado (mesmo CT-01)          |
| CT-05 | 88790329130005  | numerico    | sim    | razaoSocial < 3 chars            |
| CT-06 | 77790329130099  | numerico    | sim    | sem nomeResponsavel              |
| CT-07 | 66790329130072  | numerico    | sim    | sem Authorization header         |
| CT-08 | 55790329130056  | numerico    | sim    | UI happy path                    |
| CT-09 | 44790329130030  | numerico    | sim    | UI - mascara e payload sem fmt   |

Razao social com timestamp pra rastreabilidade: `QA F02 CT0X 1779032913 Ltda`.

## Casos de Teste

### CT-01 — POST happy path CNPJ numerico (RF-01, RF-02 numerico)
- **Tipo:** API
- **Endpoint:** `POST /api/v1/usuarios-musica`
- **Body:** payload completo com CNPJ `99790329130021`, razao social, nome fantasia,
  endereco completo, contato com nomeResponsavel.
- **Expected:** `201 Created`. Body com `id` (uuid), `status=ATIVO`,
  `cnpjFormatado` = "99.790.329/1300-21", `criadoEm` presente.

### CT-02 — POST happy path CNPJ alfanumerico (RF-02 alfanumerico)
- **Tipo:** API
- **Endpoint:** `POST /api/v1/usuarios-musica`
- **Body:** payload com CNPJ `12ABC34501DE35`.
- **Expected:** `201 Created`. CNPJ aceito (formato alfanumerico novo RFB).
  cnpjFormatado = "12.ABC.345/01DE-35".

### CT-03 — POST CNPJ com DV invalido (RF-02 negativo)
- **Tipo:** API
- **Endpoint:** `POST /api/v1/usuarios-musica`
- **Body:** CNPJ `99790329130022` (CT-01 com ultimo digito alterado).
- **Expected:** `422 Unprocessable Entity`, `detail` contendo "CNPJ" e "inválido".

### CT-04 — POST CNPJ duplicado (RF-03)
- **Tipo:** API
- **Pre-condicao:** CT-01 OK (CNPJ `99790329130021` ja existe).
- **Body:** payload com mesmo CNPJ do CT-01.
- **Expected:** `409 Conflict`, `detail` contendo "já" e "cadastrado".

### CT-05 — POST razao social com 2 caracteres (RF-07 negativo)
- **Tipo:** API
- **Body:** CNPJ `88790329130005`, razaoSocial = "QA" (2 chars).
- **Expected:** `400 Bad Request` (validacao Bean Validation).

### CT-06 — POST sem nomeResponsavel no contato (RF-06 negativo)
- **Tipo:** API
- **Body:** CNPJ `77790329130099`, contato sem nomeResponsavel.
- **Expected:** `400 Bad Request`.

### CT-07 — POST sem Authorization header (RBAC)
- **Tipo:** API
- **Body:** payload valido, sem header `Authorization`.
- **Expected:** `401 Unauthorized`.

### CT-08 — UI: criar pelo frontend e verificar persistencia
- **Tipo:** UI (Playwright Chromium headless)
- **Pre-condicao:** login Logto via formulario.
- **Passos:**
  1. Login na UI
  2. Navegar ate area de Usuarios de Musica
  3. Abrir formulario "Novo"
  4. Preencher campos com CNPJ `55790329130056`
  5. Submeter
  6. Verificar mensagem de sucesso e que usuario aparece na lista com status ATIVO
- **Expected:** Usuario aparece na lista com status ATIVO; mensagem de sucesso na UI;
  validacao via API (GET /usuarios-musica/{id}) confirma persistencia.

### CT-09 — UI: mascara visual de CNPJ vs payload enviado (RF-02)
- **Tipo:** UI (Playwright com intercept de rede)
- **Pre-condicao:** sessao Playwright ativa.
- **Passos:**
  1. Abrir formulario "Novo"
  2. Digitar CNPJ `44790329130030` formatado (44.790.329/1300-30)
  3. Capturar request POST /usuarios-musica via Playwright
  4. Inspecionar body do POST
- **Expected:** CNPJ no payload enviado a API e SEM formatacao (`44790329130030`).

## Gate Anti-Jeitinho

- Se a API rejeitar escrita no CT-01 com 401/403 (problema de role RBAC):
  - **PARAR** imediatamente os casos de escrita (CT-01, CT-02, CT-04, CT-05, CT-06, CT-08, CT-09).
  - Registrar todos como FAIL/BLOCKED com expected vs actual exatos.
  - **NAO** trocar de usuario ou tentar contornar.
  - CT-07 (sem auth) ainda pode ser executado, mas torna-se indeterminado pois "401 esperado" pode ser do mesmo motivo.
- Se algum CT falhar por motivo isolado: registrar e continuar com os demais
  (sao casos independentes).

## Tipos de retorno esperados pela API

Baseado em `api-contract.md`, a API segue padrao Problem Details (RFC 7807) para erros.
A resposta de listagem (qa_task_01) usou wrapper `items + metadata`, divergindo da spec
em `data + pagination`. Sera notado no relatorio mas nao bloqueia HU-01.

## Evidencias a coletar

- `test_plan.md` (este arquivo)
- `requests.log` - todos os requests/responses cURL com token mascarado
- `screenshots/*.png` - UI: home pos-login, navegacao ate Usuarios, form vazio,
  form preenchido, sucesso, lista mostrando novo usuario, network detail CT-09
- `videos/*.webm` - gravacao Playwright
- `console.log` - console do browser
- `created_users.json` - IDs/CNPJs criados pelos CTs 01, 02, 08, 09 pras tasks 04/05/06/07
- `qa_report_task_02.md` - relatorio final
