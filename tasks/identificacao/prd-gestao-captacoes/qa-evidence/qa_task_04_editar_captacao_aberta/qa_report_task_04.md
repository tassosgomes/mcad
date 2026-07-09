# QA Report — qa_task_04 Editar Captação ABERTA (RF-04)

**Task ID:** qa_task_04_editar_captacao_aberta
**Data/Hora:** 2026-06-20T01:36:00Z
**Status Geral:** ⚠️ PASS c/ ressalvas (RN-08 funciona mas código HTTP errado; 2 casos não testáveis)

---

## Contexto

- **User Story:** RF-04 — Editar Captação ABERTA (RN-08 propriedade, RN-01, rubrica bloqueada c/ execuções)
- **Usuário A:** analista_identificacao (sub `jrc0vems4r1q`, analistaId local `b51e719e`) — **dono**
- **Usuário B:** ilee / Ira Lee Jr (sub `7ygq7v5ljp86`) — **não-dono** (também analista)
- **Fixture:** `82ed1b0f` (STREAMING_AUDIO, 2026-06-17, ABERTA, owner=A)

---

## Casos de Teste

| ID | Descrição | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | PUT por dono → 200 (dados atualizados) | API | ✅ PASS |
| CT-02 | RN-01: mudar rubrica+período para combo ativo existente → 409 | API | ✅ PASS |
| CT-03 | PUT em captação FECHADA → bloqueado | API | ⚠️ NÃO TESTÁVEL (sem FECHADA) |
| CT-04a | Mudar rubrica SEM execuções → permitido (controle) | API | ✅ PASS |
| CT-04c | Mudar rubrica COM execuções → bloqueado | API | ⚠️ NÃO TESTÁVEL (sem execuções) |
| CT-05 | Editar via formulário UI | UI | ✅ PASS |
| CT-06 | RN-08: ilee tenta editar captação de A → bloqueado | API | ⚠️ PASS c/ code drift (422 ≠ 403) |
| CT-07 | RN-08: ilee vê detalhe → botões Fechar Rol/Excluir ocultos | UI | ✅ PASS |

---

## Detalhes dos Casos

### CT-01 — PUT sucesso ✅ PASS
PUT no F_EDIT (dono A): 200, `status="Aberta"`, `usuarioMusicaNome="QA-F04-Edit-Alterado"`. Edição por dono funciona.

### CT-02 — RN-01 duplicata ✅ PASS
PUT tentando mudar rubrica+período para RADIO 2026-06-19 (já existente ativo) → 409. Bloqueio de unicidade funciona.

### CT-03 — FECHADA bloqueada ⚠️ NÃO TESTÁVEL
`POST /fechar` (Fechar Rol) retorna 422 porque o Rol não tem execuções (pré-requisitos não atendidos). Sem um fluxo completo F02→F05, não é possível produzir uma captação FECHADA para testar o bloqueio de edição.

### CT-04a — Mudar rubrica sem execuções ✅ PASS
PUT alterando rubrica de RADIO para STREAMING_AUDIO em captação sem execuções → 200 permitido. Comportamento correto: bloqueio é condicional a ter execuções.

### CT-04c — Rubrica bloqueada com execuções ⚠️ NÃO TESTÁVEL
Não foi possível criar execuções na captação (o endpoint `POST /captacoes/{id}/execucoes` exige referência a obra do Cadastro, retornando 404 "Obra não encontrada no Cadastro"). Sem dados de F02/F04, este caso é inverificável.

### CT-05 — UI editar ✅ PASS
Alterado período de 16/06 para 17/06 via formulário na página de detalhe. `PUT` observado na rede com status 200. Página recarregada com os dados atualizados.

### CT-06 — RN-08 ilee não-dono ⚠️ PASS c/ code drift
ilee faz PUT em F_EDIT (owned by A) → **bloqueado** com mensagem "Apenas o analista responsável pode modificar esta captação."
**Divergência:** HTTP **422** Unprocessable Entity ao invés de **403 FORBIDDEN** documentado no `api-contract.md`. A regra de negócio está correta, mas o código HTTP está errado.

### CT-07 — RN-08 UI: botões ocultos ✅ PASS
ilee navega para detalhe de F_EDIT → **botões "Fechar Rol" e "Excluir" não são exibidos** para não-dono. O formulário de edição com "Salvar Alterações" ainda é visível (mas a API bloquearia com 422).

---

## Resumo de Evidências

```
qa_task_04_editar_captacao_aberta/
├── test_plan.md
├── screenshots/
│   └── ct07_ilee_nao_dono_actions_hidden.png
└── requests.log
```

---

## Informações para o Orquestrador

**Status final:** PASS c/ ressalvas
**Code drift RN-08:** 422 (atual) ≠ 403 (documentado)
**Não testável:** CT-03 (FECHADA) e CT-04c (rubrica c/ execuções) — dependem dos fluxos F02/F04/F05
**Cleanup:** Fixtures excluídas (DELETE 204)
