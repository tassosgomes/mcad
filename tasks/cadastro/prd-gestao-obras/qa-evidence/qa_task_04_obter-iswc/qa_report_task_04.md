# QA Report — HU-02: Obter ISWC via API

**Task ID:** qa_task_04
**Data/Hora:** 2026-04-09T00:56:00Z
**Status Geral:** PASS

---

## Contexto

- **User Story:** HU-02: Obter ISWC via API — Como Analista de Cadastro, eu quero clicar em "Obter ISWC" na obra que já possui titulares autorais vinculados, para que o sistema obtenha automaticamente o código ISWC da API externa.
- **Ambiente:** http://localhost:5001 (API) | http://localhost:5173 (Frontend)
- **Tipos de teste:** API | Banco | UI
- **Autenticacao:** Sim — Keycloak externo (https://keycloak.tasso.dev.br) — analista.teste / analista-cadastro

---

## Observacao de Infra

O Keycloak nao esta disponivel em localhost:8080 (conforme session.json). Foi utilizado o endpoint externo https://keycloak.tasso.dev.br (conforme OIDC_AUTHORITY no .env), que respondeu corretamente e emitiu token valido.

---

## Pre-condicoes Verificadas

- Tabela `cadastro.titularidades_autorais` existe e estava acessivel
- Feature F04 (Titularidades Autorais) implementada — endpoint POST /api/v1/obras/{id}/titularidades funcional
- Foi criada titularidade autoral (AUTOR, 100%) para "Garota de Ipanema" (PENDENTE) como setup do CT-03
- Existiam obras com status DEPURADA, DOMINIO_PUBLICO e LIBERADO para testes negativos

---

## Casos de Teste

| ID | Descricao | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | POST /iswc em obra PENDENTE sem titulares autorais | API | PASS |
| CT-02 | DB: Verificar pre-condicao — tabela titularidades_autorais | Banco | PASS |
| CT-03 | POST /iswc em obra PENDENTE com titulares (happy path) | API | PASS |
| CT-04 | DB: Verificar persistencia do ISWC apos obtencao | Banco | PASS |
| CT-05 | POST /iswc em obra que ja possui ISWC (duplicata) | API | PASS |
| CT-06a | UI: Botao "Obter ISWC" visivel em obra PENDENTE | UI | PASS |
| CT-06b | UI: Botao "ISWC Obtido" exibido em obra com ISWC (RF-20) | UI | PASS |
| CT-07a | POST /iswc em obra DEPURADA (deve rejeitar) | API | PASS |
| CT-07b | POST /iswc em obra DOMINIO_PUBLICO (deve rejeitar) | API | PASS |

---

## Detalhes por Caso

### CT-01 — POST /iswc em obra PENDENTE sem titulares PASS

**Obra testada:** Andar com Fe (id=3a42dd7a-1f44-4f19-af88-33ec27a5e0d7, status=PENDENTE, sem titulares)

**Expected:** HTTP 422 com mensagem indicando falta de titular autoral

**Actual:** HTTP 422 — `{"title":"Unprocessable Entity","status":422,"detail":"A obra deve ter titulares autorais para obter ISWC.","instance":"/api/v1/obras/3a42dd7a.../iswc"}`

**RF testado:** RF-16 (botao habilitado apenas com titular autoral)

**Evidencias:** `requests.log` secao CT-01

---

### CT-02 — DB: Pre-condicao titularidades_autorais PASS

**Query:** SELECT COUNT(*) FROM cadastro.titularidades_autorais

**Expected:** Tabela existe e acessivel

**Actual:** 4 registros encontrados. Apenas "Garota de Ipanema" (PENDENTE) tinha titularidade depois do setup.

**Evidencias:** `requests.log` secao CT-02

---

### CT-03 — POST /iswc em obra PENDENTE com titulares PASS

**Obra testada:** Garota de Ipanema (id=9f5729f0-0cfc-41dd-9af5-0c90c77623c9, status=PENDENTE, 1 titular AUTOR 100%)

**Expected:** HTTP 200 com ISWC preenchido na obra retornada

**Actual:** HTTP 200 — obra retornada com iswc="T-721428352-3", status atualizado para "LIBERADO"

```json
{
  "id": "9f5729f0-0cfc-41dd-9af5-0c90c77623c9",
  "titulo": "Garota de Ipanema",
  "iswc": "T-721428352-3",
  "status": "LIBERADO"
}
```

**RF testados:** RF-17 (chamada API externa), RF-18 (ISWC salvo automaticamente)

**Evidencias:** `requests.log` secao CT-03

---

### CT-04 — DB: Persistencia do ISWC PASS

**Query:** SELECT Id, Titulo, Iswc, Status FROM cadastro.obras_musicais WHERE Id = '9f5729f0...'

**Expected:** Campo Iswc = "T-721428352-3", nao nulo

**Actual:**
```
Id                                   | Titulo            | Iswc          | Status   | AtualizadoEm
9f5729f0-0cfc-41dd-9af5-0c90c77623c9 | Garota de Ipanema | T-721428352-3 | LIBERADO | 2026-04-09 00:51:51.558908+00
```

**RF testado:** RF-18 (ISWC persistido na obra)

**Evidencias:** `requests.log` secao CT-04

---

### CT-05 — POST /iswc em obra que ja possui ISWC PASS

**Obra testada:** Garota de Ipanema (status=LIBERADO apos obter ISWC)

**Expected:** Erro 4xx — obra ja tem ISWC ou nao e mais PENDENTE

**Actual:** HTTP 422 — `{"detail":"ISWC só pode ser solicitado para obras PENDENTES."}`

**Nota:** A protecao e feita via status (nao-PENDENTE) em vez de verificacao direta de ISWC duplicado. O resultado e equivalente — a operacao e rejeitada corretamente.

**RF testado:** RF-21 (ISWC unico — duplicata rejeitada)

**Evidencias:** `requests.log` secao CT-05

---

### CT-06a — UI: Botao "Obter ISWC" em obra PENDENTE PASS

**Obra testada:** Aquarela do Brasil (id=23f131c1, PENDENTE, sem titulares, sem ISWC)

**Expected:** Botao "Obter ISWC" visivel na secao "Codigo ISWC" da tela de detalhe

**Actual:** Botao "Obter ISWC" visivel no painel direito da tela. Screenshot confirma presenca.

**Nota:** O botao aparece desabilitado pois a obra nao tem titulares — mas esta VISIVEL, conforme RF-15. RF-16 e atendido corretamente (desabilitado sem titulares).

**RF testados:** RF-15 (botao visivel), RF-16 (desabilitado sem titulares)

**Evidencias:** `screenshots/ct06a_pass.png`

---

### CT-06b — UI: Botao "ISWC Obtido" em obra com ISWC PASS

**Obra testada:** Garota de Ipanema (LIBERADO, iswc=T-721428352-3)

**Expected:** Botao "ISWC Obtido" (desabilitado) e ISWC exibido na tela

**Actual:**
- Botoes "ISWC Obtido" encontrados: 1
- Botoes "Obter ISWC" habilitados: 0
- ISWC "T-721428352-3" exibido na tela: sim

**RF testado:** RF-20 (botao exibe "ISWC Obtido" quando ja tem ISWC) — IMPLEMENTADO

**Evidencias:** `screenshots/ct06b_result.png`

---

### CT-07a — POST /iswc em obra DEPURADA PASS

**Obra testada:** Obra de Teste (id=0a017a52, status=DEPURADA)

**Expected:** HTTP 4xx — operacao nao permitida para obras nao-PENDENTES

**Actual:** HTTP 422 — `{"detail":"ISWC só pode ser solicitado para obras PENDENTES."}`

**RF testado:** RF-22 (botao nao aparece em DEPURADA — verificado que chamada direta e rejeitada)

**Evidencias:** `requests.log` secao CT-07a

---

### CT-07b — POST /iswc em obra DOMINIO_PUBLICO PASS

**Obra testada:** QA DP Obra Pendente (id=00306a5d, status=DOMINIO_PUBLICO)

**Expected:** HTTP 4xx — operacao nao permitida

**Actual:** HTTP 422 — `{"detail":"ISWC só pode ser solicitado para obras PENDENTES."}`

**RF testado:** RF-22 (botao nao aparece em DOMINIO_PUBLICO — chamada direta rejeitada)

**Evidencias:** `requests.log` secao CT-07b

---

## Cobertura de Requisitos

| RF | Descricao | Status |
|----|-----------|--------|
| RF-15 | Botao "Obter ISWC" visivel para obras PENDENTE | PASS |
| RF-16 | Botao habilitado apenas com titular autoral | PASS |
| RF-17 | Chamada API externa com work_title, authors[], association_code | PASS (inferido — ISWC retornado) |
| RF-18 | ISWC salvo automaticamente na obra | PASS |
| RF-19 | Mensagem amigavel em caso de erro API externa | NAO TESTADO — API externa nao falhou durante execucao |
| RF-20 | Botao exibe "ISWC Obtido" quando ja tem ISWC | PASS |
| RF-21 | ISWC unico — duplicata rejeitada | PASS |
| RF-22 | Botao nao aparece em obras DEPURADA ou DOMINIO_PUBLICO | PASS |

---

## Resumo de Evidencias

```
tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_04_obter-iswc/
├── test_plan.md
├── requests.log
├── qa_report_task_04.md
├── screenshots/
│   ├── ct06a_pass.png          — botao "Obter ISWC" visivel em obra PENDENTE
│   ├── ct06a_obra_pendente_loaded.png
│   ├── ct06a_pre_assert.png
│   ├── ct06b_obra_com_iswc.png
│   └── ct06b_result.png        — "ISWC Obtido" e valor exibido em obra LIBERADO
└── videos/
```

---

## Status para o Orquestrador

**Status:** PASS

**Observacoes:**
1. RF-19 (mensagem de erro quando API externa falha) nao foi possivel testar pois a API externa https://iswc.tasso.dev.br respondeu com sucesso durante toda a execucao. Recomenda-se teste especifico com mock/stub da API externa.
2. Keycloak local (localhost:8080) indisponivel — utilizou-se endpoint externo conforme .env.
3. Feature F04 (Titularidades Autorais) esta implementada e funcional — foi necessario adicionar titular via API como pre-setup do CT-03.
4. O status da obra muda de PENDENTE para LIBERADO apos obtencao do ISWC — comportamento correto de acordo com o fluxo de liberacao.

**Tasks possivelmente impactadas:** qa_task_05 (depuracao) e qa_task_07 (exclusao) dependem de obras com status variados — a "Garota de Ipanema" passou de PENDENTE para LIBERADO durante este teste.
