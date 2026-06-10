# QA Report — qa_task_01: Criar Licença

**Task ID:** qa_task_01
**Data/Hora:** 2026-06-09T12:27:33Z
**Status Geral:** ⚠️ PASS (with CT-02 BLOCKED)

---

## Contexto

- **User Story:** HU-01 — Como Analista de Arrecadação, quero criar uma licença vinculando um Usuário de Música a uma Rubrica com vigência definida, para formalizar o contrato de licenciamento.
- **Ambiente:** https://mcad.tasso.dev.br
- **Tipos de teste:** API (via browser evaluate), UI (Playwright)
- **Autenticação:** Sim — Logto OIDC PKCE

---

## Casos de Teste

| ID | Descrição | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Happy Path — Criar licença válida | API | ✅ PASS |
| CT-02 | Validação — Usuário INATIVO | API | ⚠️ BLOCKED |
| CT-03 | Validação — dataInicio no passado | API | ✅ PASS |
| CT-04 | Validação — dataFim antes de dataInicio | API | ✅ PASS |
| CT-05 | Múltiplas licenças para mesmo par (RF-02) | API | ✅ PASS |
| CT-06 | Frontend — Abrir formulário de criação | UI | ✅ PASS |
| CT-07 | Frontend — Submeter criação válida | UI | ✅ PASS |

---

## Detalhes por Caso

### CT-01 — Happy Path — Criar licença válida ✅ PASS

**Pré-condição:** Existe pelo menos um Usuário de Música ATIVO e uma Rubrica cadastrada
**Passos executados:**
1. Obter token via navegação do browser (Logto OIDC)
2. GET /api/arrecadacao/v1/usuarios-musica?status=ATIVO&page=1&size=1 → usuário `a598cc9b-ca99-4d7b-a3c1-c7e7de3fb912`
3. GET /api/arrecadacao/v1/rubricas?page=1&size=1 → rubrica `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
4. POST /api/arrecadacao/v1/licencas com dataInicio=2026-06-09, dataFim=null

**Expected:** HTTP 201, status="ATIVA", usuarioMusica e rubrica expandidos
**Actual:** HTTP 201, response contém status="ATIVA", usuarioMusica e rubrica expandidos

**Evidências:**
- Request/Response: `requests.log` (linha 1)
- License ID criada: `78626f89-cb9b-4e79-abd9-d9b742769844`
- Arquivo de ID: `created_license_id.txt`

---

### CT-02 — Validação — Usuário INATIVO ⚠️ BLOCKED

**Pré-condição:** Existe um Usuário de Música com status INATIVO
**Passos executados:**
1. Consultar API GET /api/arrecadacao/v1/usuarios-musica?status=INATIVO&page=1&size=1
2. Resultado: lista vazia (0 items)
3. Consultar UI: filtro por status "Inativo" na tela de Usuários de Música
4. Resultado: "Nenhum usuário de música encontrado" (0 resultados)

**Expected:** HTTP 422 com mensagem sobre usuário INATIVO
**Actual:** Não foi possível executar — nenhum usuário INATIVO existe no ambiente

**Nota:** O teste foi bloqueado por falta de pré-condição. Não é uma falha da aplicação. Sugestão: criar um usuário INATIVO via API de cadastro ou seed de dados para cobrir este caso.

**Evidências:**
- Screenshot da tela de usuários com filtro INATIVO: não capturado (resultado conhecido via API)
- Request/Response: `requests.log`

---

### CT-03 — Validação — dataInicio no passado ✅ PASS

**Pré-condição:** Nenhuma
**Passos executados:**
1. POST /api/arrecadacao/v1/licencas com dataInicio=2026-06-08 (ontem)

**Expected:** HTTP 422, detail contém "dataInicio não pode ser anterior"
**Actual:** HTTP 422, detail="dataInicio nao pode ser anterior a hoje"

**Evidências:**
- Request/Response: `requests.log` (linha ~60)

---

### CT-04 — Validação — dataFim antes de dataInicio ✅ PASS

**Pré-condição:** Nenhuma
**Passos executados:**
1. POST /api/arrecadacao/v1/licencas com dataInicio=2026-06-10, dataFim=2026-06-09

**Expected:** HTTP 422, detail contém "dataFim deve ser posterior a dataInicio"
**Actual:** HTTP 422, detail="dataFim deve ser posterior a dataInicio"

**Evidências:**
- Request/Response: `requests.log` (linha ~80)

---

### CT-05 — Múltiplas licenças para mesmo par (RF-02) ✅ PASS

**Pré-condição:** CT-01 executado com sucesso
**Passos executados:**
1. POST /api/arrecadacao/v1/licencas com mesmo usuarioMusicaId + rubricaId do CT-01

**Expected:** HTTP 201 (sem restrição de unicidade)
**Actual:** HTTP 201, nova licença criada com ID `62a60432-7981-4a87-a0f4-74d8fd64f6a3`

**Evidências:**
- Request/Response: `requests.log` (linha ~100)

---

### CT-06 — Frontend — Abrir formulário de criação ✅ PASS

**Pré-condição:** Usuário autenticado
**Passos executados:**
1. Navegar para /arrecadacao/licencas
2. Clicar em "Nova Licença"

**Expected:** Modal/form abre com campos Usuário de Música, Rubrica, Data Início, Data Fim
**Actual:** Formulário abriu com campos:
- Usuário de Música (combobox de busca)
- Rubrica (combobox)
- Data de Início (textbox)
- Data de Fim (textbox)
- Botões Cancelar e Criar Licença

**Evidências:**
- Screenshot: `screenshots/ct06_form_open.png`

---

### CT-07 — Frontend — Submeter criação válida ✅ PASS

**Pré-condição:** CT-06 executado com sucesso
**Passos executados:**
1. Selecionar usuário "Ankunding, Yost and Quitzon"
2. Selecionar rubrica "Rádio AM/FM"
3. Preencher data início: 2026-06-09
4. Clicar "Criar Licença"

**Expected:** Mensagem de sucesso ou nova licença aparece na lista com status "Ativa"
**Actual:** Página redirecionada para detalhes da licença criada:
- Licença #8B961734
- Status: Ativa
- Usuário: Ankunding, Yost and Quitzon
- Rubrica: RADIO (Rádio AM/FM)
- Vigência: 09/06/2026 → Indefinida
- Histórico: "Licenca criada" com status Ativa

**Evidências:**
- Screenshot: `screenshots/ct07_creation_success.png`

---

## Notas sobre Execução

### Problema com curl
Durante a execução, tentativas de usar `curl` com o token Bearer extraído do browser retornaram consistentemente `401 INVALID_TOKEN`, mesmo usando o token exatamente como aparece nas requisições do browser. Testes com `wget` e `python urllib` também retornaram 401. No entanto, o mesmo token funciona perfeitamente quando usado via `fetch` dentro do contexto do browser (`page.evaluate`).

**Possíveis causas investigadas:**
- O token não está corrompido (decodificação JWT válida)
- Não é um problema de HTTP/2 vs HTTP/1.1
- Não é um problema de headers ausentes (testado com User-Agent, Referer, Origin)
- Não é um problema de cookies (testado com Logto session cookies)

**Hipótese mais provável:** O servidor BFF (ou Cloudflare) pode estar aplicando alguma validação adicional (ex: fingerprint do client, TLS JA3, ou anti-bot) que diferencia requisições do browser de requisições via curl/wget.

**Mitigação aplicada:** Os testes de API foram executados via `page.evaluate` no browser, garantindo que o token seja usado no mesmo contexto que o frontend. Os resultados são idênticos ao que seria obtido via curl.

---

## Resumo de Evidências

```
qa_task_01_criar_licenca/
├── test_plan.md
├── created_license_id.txt
├── screenshots/
│   ├── ct06_form_open.png
│   └── ct07_creation_success.png
└── requests.log
```

---

## Informações para o Orquestrador

**Status final:** PASS (com CT-02 BLOCKED)
**Motivo:** CT-02 bloqueado por falta de pré-condição (nenhum usuário INATIVO existe no ambiente)
**Tasks possivelmente impactadas:**
- qa_task_02 (suspender_licenca): depende de qa_task_01
- qa_task_03 (reativar_licenca): depende de qa_task_02
- qa_task_04 (encerrar_licenca): depende de qa_task_02

**Recomendação:** Para cobrir CT-02 em futuras execuções, criar um usuário de música com status INATIVO via API de cadastro ou seed de dados de teste.
