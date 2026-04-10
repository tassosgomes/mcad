# QA Report — HU-01: Criar obra musical

**Task ID:** qa_task_01
**Data/Hora:** 2026-04-09T00:45:00Z
**Status Geral:** FAIL

---

## Contexto

- **User Story:** HU-01 — Como Analista de Cadastro, eu quero criar uma obra musical informando título, tipo e gênero, para que ela exista no sistema como rascunho (PENDENTE).
- **Ambiente:** http://localhost:5001 (API) | http://localhost:5173 (Frontend)
- **Tipos de teste:** API | Banco | UI
- **Autenticação:** Sim (Keycloak em https://keycloak.tasso.dev.br, perfil analista-cadastro)

---

## Casos de Teste

| ID | Descrição | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Criar obra com campos mínimos (título + tipo LITEROMUSICAL) | API | PASS |
| CT-02 | Criar obra com todos os campos (título + tipo + subtítulo + gênero) | API | PASS |
| CT-03 | POST sem título — esperado HTTP 400 | API | FAIL |
| CT-04 | POST sem tipo — esperado HTTP 400 | API | FAIL |
| CT-05 | POST com tipo inválido "INVALIDO" — esperado HTTP 400 | API | FAIL |
| CT-06 | GET /api/v1/obras/{id} com ID criado no CT-01 | API | PASS |
| CT-07 | Validação de persistência no banco cadastro.obras_musicais | Banco | PASS |
| CT-08 | UI — criar obra via formulário /cadastro/obras/nova | UI | FAIL |

---

## Detalhes por Caso

### CT-01 — Criar obra com campos mínimos — PASS

**Expected:** HTTP 201; body com status="PENDENTE", iswc=null (JSON null), dominioPublico=false, id (UUID válido), titulo="Meu Bem Querer", tipo="LITEROMUSICAL"
**Actual:** HTTP 201; body exato conforme esperado.

Body de resposta:
```json
{
  "id": "c0cf0fe6-e563-4d04-92ed-4bc666a9e026",
  "codigo": 7,
  "titulo": "Meu Bem Querer",
  "subtitulo": null,
  "tipo": "LITEROMUSICAL",
  "genero": null,
  "iswc": null,
  "status": "PENDENTE",
  "dominioPublico": false,
  "obraDepuradaParaId": null,
  "criadoEm": "2026-04-09T00:36:45.6423188Z",
  "atualizadoEm": "2026-04-09T00:36:45.6423188Z",
  "bloqueioJustificativa": null
}
```

**Evidências:** `requests.log` linhas 1-28

---

### CT-02 — Criar obra com todos os campos opcionais — PASS

**Expected:** HTTP 201; subtitulo="The Girl from Ipanema", genero="Bossa Nova", status="PENDENTE", iswc=null
**Actual:** HTTP 201; todos os campos retornados corretamente.

Body de resposta:
```json
{
  "id": "9f5729f0-0cfc-41dd-9af5-0c90c77623c9",
  "titulo": "Garota de Ipanema",
  "subtitulo": "The Girl from Ipanema",
  "tipo": "MUSICAL",
  "genero": "Bossa Nova",
  "iswc": null,
  "status": "PENDENTE",
  "dominioPublico": false
}
```

**Evidências:** `requests.log` linhas 30-56

---

### CT-03 — POST sem título — FAIL

**Passos executados:**
1. POST /api/v1/obras com body `{"tipo": "MUSICAL"}`
2. FALHOU AQUI: servidor retornou HTTP 500 em vez de 400

**Expected:** HTTP 400 com erro de validação indicando que título é obrigatório
**Actual:** HTTP 500 — Internal Server Error

**Erro capturado:**
```json
{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Value cannot be null. (Parameter 'titulo')",
  "instance": "/api/v1/obras"
}
```

**Análise:** O erro revela que a exception `ArgumentNullException` está sendo lançada e não capturada pelo middleware de validação. O campo `titulo` é deserializado como `null` e causa exception na camada de domínio/aplicação sem ser interceptada pelo validator antes. A validação não está protegendo a entrada de forma adequada — a exceção deveria ser capturada e convertida para HTTP 400.

**Evidências:** `requests.log` linhas 58-76

---

### CT-04 — POST sem tipo — FAIL

**Passos executados:**
1. POST /api/v1/obras com body `{"titulo": "Obra Sem Tipo"}`
2. FALHOU AQUI: servidor retornou HTTP 500 em vez de 400

**Expected:** HTTP 400 com erro de validação indicando que tipo é obrigatório
**Actual:** HTTP 500 — Internal Server Error

**Erro capturado:**
```json
{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Object reference not set to an instance of an object.",
  "instance": "/api/v1/obras"
}
```

**Análise:** NullReferenceException ao tentar processar o tipo ausente. O validator não está sendo executado antes da tentativa de conversão/uso do campo `tipo`. Indica ausência de validação de presença do campo ou falha no pipeline de validação.

**Evidências:** `requests.log` linhas 78-96

---

### CT-05 — POST com tipo inválido — FAIL

**Passos executados:**
1. POST /api/v1/obras com body `{"titulo": "Obra Tipo Invalido", "tipo": "INVALIDO"}`
2. FALHOU AQUI: servidor retornou HTTP 500 em vez de 400

**Expected:** HTTP 400 com erro de validação indicando tipo inválido (fora do enum MUSICAL|LITEROMUSICAL|VERSAO|POT_POURRI)
**Actual:** HTTP 500 — Internal Server Error

**Erro capturado:**
```json
{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Requested value 'INVALIDO' was not found.",
  "instance": "/api/v1/obras"
}
```

**Análise:** `InvalidOperationException` de conversão de string para enum (`ObraTipo`) chegando não tratada ao cliente. Deveria ser capturada e retornada como HTTP 400 pela camada de validação ou pelo middleware de tratamento de erros.

**Evidências:** `requests.log` linhas 98-116

---

### CT-06 — GET /api/v1/obras/{id} — PASS

**Expected:** HTTP 200; body com todos os campos da obra criada no CT-01 (status=PENDENTE, iswc=null, titulo="Meu Bem Querer", tipo="LITEROMUSICAL")
**Actual:** HTTP 200; body idêntico ao esperado.

**Evidências:** `requests.log` linhas 118-143

---

### CT-07 — Validação no banco de dados — PASS

**Query executada:**
```sql
SELECT "Id", "Titulo", "Tipo", "Status", "Iswc", "DominioPublico", "CriadoEm"
FROM cadastro.obras_musicais
WHERE "Id" = 'c0cf0fe6-e563-4d04-92ed-4bc666a9e026';
```

**Expected:** Registro com Id=c0cf0fe6-e563-4d04-92ed-4bc666a9e026, Titulo=Meu Bem Querer, Tipo=LITEROMUSICAL, Status=PENDENTE, Iswc=NULL, DominioPublico=false
**Actual:** `c0cf0fe6-e563-4d04-92ed-4bc666a9e026|Meu Bem Querer|LITEROMUSICAL|PENDENTE||f|2026-04-09 00:36:45.642318+00`

Todos os campos confirmados: Status=PENDENTE, Iswc=NULL (campo vazio), DominioPublico=f (false).

**Evidências:** `requests.log` linhas 144-171

---

### CT-08 — UI: Criar obra via formulário — FAIL

**Passos executados:**
1. Navegou para http://localhost:5173/ — redirecionado ao Keycloak
2. Login realizado com credenciais de analista.teste
3. Redirecionado para http://localhost:5173/cadastro/associacoes (login bem-sucedido)
4. Navegou para http://localhost:5173/cadastro/obras/nova
5. Campo #obra-titulo visível: true
6. Preencheu título "Obra Via Interface"
7. Selecionou tipo MUSICAL via select #obra-tipo
8. Clicou em botão submit (Salvar)
9. Redirecionado para http://localhost:5173/cadastro/obras (URL correta)
10. Toast "Obra criada com sucesso" visível no screenshot ct08_06
11. FALHOU AQUI: locator `text=Obra Via Interface` não encontrado na listagem

**Expected:** Obra "Obra Via Interface" visível na listagem após criação e redirecionamento
**Actual:** Locator de texto não encontrou a obra. A listagem estava com spinner de carregamento no momento da captura (ct08_06), e quando o screenshot ct08_07 foi tirado a obra não apareceu na área visível da listagem.

**Verificação adicional via API:** A obra existe confirmada — busca por título retornou:
```json
{
  "data": [{
    "id": "9e256799-3814-43d1-b61c-e077cec9df8a",
    "titulo": "Obra Via Interface",
    "tipo": "MUSICAL",
    "status": "PENDENTE"
  }]
}
```

**Contexto do erro:** O fluxo de criação foi bem-sucedido (criação confirmada por toast e por API), mas a assertion de visibilidade na listagem falhou. A listagem usa paginação — a obra pode estar em página posterior ou a listagem não terminou de renderizar dentro do timeout de 8 segundos do locator.

**Console do browser:**
```
[debug] [vite] connecting...
[debug] [vite] connected.
[info] Download the React DevTools for a better development experience
```
Sem erros JavaScript.

**Evidências:**
- Screenshot ct08_06 (pós-submit, toast de sucesso): `screenshots/ct08_06_pos_submit.png`
- Screenshot ct08_07 (listagem carregada): `screenshots/ct08_07_listagem_com_obra.png`
- Vídeo: `videos/ct08-criar-obra-ui-CT-08-H-4bb34-eencher-formulário-e-salvar/video.webm`
- Log: `requests.log` linhas 173-206

---

## Resumo de Evidências

```
tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_01_criar-obra/
├── test_plan.md
├── requests.log
├── qa_report_task_01.md
├── playwright.config.ts
├── ct08-criar-obra-ui.spec.ts
├── screenshots/
│   ├── ct08_01_inicio.png
│   ├── ct08_02_login_preenchido.png (não capturado — preenchimento direto)
│   ├── ct08_03_pos_login.png
│   ├── ct08_04_pagina_nova_obra.png
│   ├── ct08_05_formulario_preenchido.png
│   ├── ct08_06_pos_submit.png          ← toast "Obra criada com sucesso" visível
│   └── ct08_07_listagem_com_obra.png   ← listagem renderizada (obra não encontrada pelo locator)
└── videos/
    └── ct08-criar-obra-ui-CT-08-H-4bb34-eencher-formulário-e-salvar/
        ├── video.webm
        ├── test-failed-1.png
        └── trace.zip
```

---

## Status para o Orquestrador

**Status:** FAIL

**Motivo da falha:**
- **CT-03, CT-04, CT-05 (API):** O servidor retorna HTTP 500 em vez de HTTP 400 para inputs inválidos. As exceções de validação (ArgumentNullException por título ausente, NullReferenceException por tipo ausente, InvalidOperationException por tipo inválido) não são capturadas pelo middleware de validação e chegam como Internal Server Error ao cliente.
- **CT-08 (UI):** O locator de texto `text=Obra Via Interface` não encontrou a obra na listagem paginada após criação. A listagem estava carregando quando o timeout de networkidle foi atingido. A criação em si foi bem-sucedida (toast confirmado, obra verificada via API).

**Observação CT-08:** A criação via UI funcionou (criação bem-sucedida, redirecionamento correto, toast de sucesso). O FAIL se deve exclusivamente à assertion de visibilidade na listagem — provável questão de timing de renderização ou paginação. Entretanto, por regra do gate anti-jeitinho, o resultado reportado é FAIL pois a assertion não passou.

**Tasks possivelmente impactadas por CT-03/CT-04/CT-05:**
- qa_task_02 (listar-e-buscar) — não afetada diretamente
- qa_task_03 (editar-obra) — pode ter problema similar se o handler de edição também não valida entrada
- qa_task_04 (obter-iswc) — não afetada diretamente

**Observação RF-03 (não testado explicitamente):** O response inclui campo `bloqueioJustificativa: null` que não estava documentado no PRD excerpt — campo adicional presente na API.
