# QA Report — HU-04: Editar dados da obra

**Task ID:** qa_task_03
**Data/Hora:** 2026-04-09T00:56:56Z
**Status Geral:** FAIL

---

## Contexto

- **User Story:** HU-04 — Como Analista de Cadastro, eu quero editar titulo, subtitulo, tipo e genero de uma obra existente, para que informacoes incorretas ou incompletas sejam corrigidas.
- **Ambiente:** http://localhost:5001
- **Frontend:** http://localhost:5173
- **Tipos de teste:** API | Banco
- **Autenticacao:** Sim (Bearer JWT via Keycloak remoto https://keycloak.tasso.dev.br)
- **Obra de teste criada:** ID f90227e2-bff5-4085-9bfe-797770c029a7 (codigo 15)
- **Obra LIBERADA disponivel:** ID c49adc4e-2aa1-4386-8ee4-121c91e3b901 (titulo "Obra de Teste Depurar")

**Observacao sobre ambiente:** O container mcad-postgres estava parado. A conexao DB foi feita diretamente via psql para db.tasso.dev.br:5432. O Keycloak local (localhost:8080) nao estava em execucao; o token foi obtido via https://keycloak.tasso.dev.br.

---

## Casos de Teste

| ID | Descricao | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | POST criar obra PENDENTE (pre-condicao) | API | PASS |
| CT-01b | PUT editar titulo de obra PENDENTE — titulo atualizado, status permanece PENDENTE | API | PASS |
| CT-02 | PUT editar tipo de obra PENDENTE (MUSICAL -> LITEROMUSICAL) | API | PASS |
| CT-03 | PUT editar genero de obra PENDENTE (MPB -> SAMBA) | API | PASS |
| CT-04 | PUT editar subtitulo de obra PENDENTE (null -> "Versao Ao Vivo") | API | PASS |
| CT-05 | Validacao banco — titulo, subtitulo e status corretos apos edicoes | Banco | PASS |
| CT-06 | PUT com titulo vazio — deve ser rejeitado (400/422) | API | FAIL |
| CT-07 | PUT alterando titulo em obra LIBERADA — espera 409 DEPURACAO_NECESSARIA | API | Nao executado |
| CT-08 | PUT alterando apenas genero em obra LIBERADA — espera 200 | API | Nao executado |
| CT-09 | UI — Navegar para pagina de edicao e salvar alteracao | UI | Nao executado |

---

## Detalhes por Caso

### CT-01 — Criar obra PENDENTE PASS

**Expected:** HTTP 201, obra criada com status PENDENTE e id no corpo
**Actual:** HTTP 201, id=f90227e2-bff5-4085-9bfe-797770c029a7, status=PENDENTE
**Evidencias:** `requests.log` linhas 12-38

---

### CT-01b — PUT editar titulo de obra PENDENTE PASS

**Expected:** HTTP 200, titulo="Meu Bem Querer", status permanece "PENDENTE"
**Actual:** HTTP 200, titulo="Meu Bem Querer", status="PENDENTE"
**Evidencias:** `requests.log` linhas 41-68

Criterio de aceitacao do PRD atendido: "titulo e atualizado normalmente, status permanece PENDENTE"

---

### CT-02 — PUT editar tipo de obra PENDENTE PASS

**Expected:** HTTP 200, tipo="LITEROMUSICAL" na resposta
**Actual:** HTTP 200, tipo="LITEROMUSICAL"
**Evidencias:** `requests.log` linhas 71-97

---

### CT-03 — PUT editar genero de obra PENDENTE PASS

**Expected:** HTTP 200, genero="SAMBA" na resposta
**Actual:** HTTP 200, genero="SAMBA"
**Evidencias:** `requests.log` linhas 100-126

---

### CT-04 — PUT editar subtitulo de obra PENDENTE PASS

**Expected:** HTTP 200, subtitulo="Versao Ao Vivo" na resposta
**Actual:** HTTP 200, subtitulo="Versao Ao Vivo"
**Evidencias:** `requests.log` linhas 129-155

---

### CT-05 — Validacao banco PASS

**Expected:** Registro na tabela cadastro.obras_musicais com Titulo="Meu Bem Querer", Subtitulo="Versao Ao Vivo", Status="PENDENTE"
**Actual:** Titulo="Meu Bem Querer", Subtitulo="Versao Ao Vivo", Tipo="LITEROMUSICAL", Genero="SAMBA", Status="PENDENTE"

Query executada: `SELECT "Titulo", "Subtitulo", "Tipo", "Genero", "Status" FROM cadastro.obras_musicais WHERE "Id" = 'f90227e2-bff5-4085-9bfe-797770c029a7'`

**Evidencias:** `requests.log` linhas 172-183

**Nota tecnica:** As colunas na tabela usam PascalCase com aspas duplas. A query inicial sem aspas falhou com "column titulo does not exist". A query corrigida com aspas duplas funcionou corretamente.

---

### CT-06 — PUT com titulo vazio FAIL

**Passos executados:**
1. PUT /api/v1/obras/f90227e2-bff5-4085-9bfe-797770c029a7 com body `{"titulo":"","tipo":"MUSICAL","genero":"MPB","subtitulo":null}`
2. FALHOU AQUI: API retornou 200 ao inves de 400/422

**Expected:** HTTP 400 ou 422 — titulo vazio deve ser rejeitado pela validacao (regra NotEmpty no AtualizarObraCommandValidator)
**Actual:** HTTP 200 — titulo vazio aceito e persistido no banco

**Resposta capturada:**
```json
{
  "id": "f90227e2-bff5-4085-9bfe-797770c029a7",
  "codigo": 15,
  "titulo": "",
  "subtitulo": null,
  "tipo": "MUSICAL",
  "genero": "MPB",
  "iswc": null,
  "status": "PENDENTE",
  "dominioPublico": false
}
```

**Analise da causa raiz:** O validator `AtualizarObraCommandValidator` define `RuleFor(x => x.Titulo).NotEmpty()`, mas o `Dispatcher.cs` nao invoca FluentValidation antes de despachar o command — resolve diretamente o `ICommandHandler` via DI sem pipeline de validacao. Os validators sao registrados via `AddValidatorsFromAssemblyContaining` mas nunca sao chamados no fluxo de escrita da API de obras.

**Evidencias:** `requests.log` linhas 193-219

**Execucao interrompida. CT-07, CT-08 e CT-09 nao foram executados.**

---

### CT-07 — PUT titulo em obra LIBERADA Nao executado

Nao executado devido a interrupcao por falha no CT-06.

Pre-condicao estava atendida: obra LIBERADA c49adc4e-2aa1-4386-8ee4-121c91e3b901 ("Obra de Teste Depurar") com ISWC confirmada no banco.

---

### CT-08 — PUT genero em obra LIBERADA Nao executado

Nao executado devido a interrupcao por falha no CT-06.

---

### CT-09 — UI edicao de obra Nao executado

Nao executado devido a interrupcao por falha no CT-06.

---

## Resumo de Evidencias

```
tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_03_editar-obra/
├── test_plan.md
├── qa_report_task_03.md
├── requests.log       — todos os requests/responses API e queries DB
├── screenshots/       — vazio (UI nao executada)
└── videos/            — vazio (UI nao executada)
```

---

## Status para o Orquestrador

**Status:** FAIL
**Motivo da falha:** CT-06 — A API PUT /api/v1/obras/{id} aceita titulo vazio ("") e retorna HTTP 200 ao inves de rejeitar com 400/422. O AtualizarObraCommandValidator com regra NotEmpty nao e executado porque o Dispatcher nao possui pipeline de validacao FluentValidation. Titulo vazio foi persistido no banco.
**Requisito violado:** Validacao implicita de integridade de dados — titulo e campo obrigatorio segundo o validator definido no codigo.
**Tasks possivelmente impactadas:** qa_task_05 (depuracao automatica, que depende de integridade do titulo), qa_task_07 (exclusao, que verifica estado da obra).
