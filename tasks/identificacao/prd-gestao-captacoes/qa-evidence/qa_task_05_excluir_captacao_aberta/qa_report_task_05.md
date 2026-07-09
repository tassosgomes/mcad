# QA Report — qa_task_05 Excluir Captação ABERTA (RF-05)

**Task ID:** qa_task_05_excluir_captacao_aberta
**Data/Hora:** 2026-06-20T01:37:00Z
**Status Geral:** ⚠️ PASS c/ ressalvas (RN-08 funciona mas código HTTP errado; UI não testável por limitação de sessão)

---

## Contexto

- **User Story:** RF-05 — Excluir Captação ABERTA (RN-08 propriedade, confirmação, FECHADA bloqueada)
- **Usuário A:** analista_identificacao — **dono**
- **Usuário B:** ilee — **não-dono**
- **Fixture:** `F_DEL` (RADIO, 2026-06-15, ABERTA, owner=A) — criada e deletada

---

## Casos de Teste

| ID | Descrição | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | DELETE por dono → 204; confirmado removido (GET → 404) | API | ✅ PASS |
| CT-02 | DELETE em FECHADA → bloqueado | API | ⚠️ NÃO TESTÁVEL (sem FECHADA) |
| CT-03 | UI: modal de confirmação + delete via interface | UI | ⚠️ LIMITADO (perda de sessão dono) |
| CT-06 | RN-08: ilee tenta deletar captação de A → bloqueado | API | ⚠️ PASS c/ code drift (422 ≠ 403) |

---

## Detalhes dos Casos

### CT-01 — DELETE dono ✅ PASS
DELETE em F_DEL (dono A): **204 No Content**. GET subsequente: **404 Not Found**. A exclusão removeu o recurso completamente.

### CT-02 — FECHADA bloqueada ⚠️ NÃO TESTÁVEL
Mesmo bloqueio documentado no RF-04: não é possível produzir uma captação FECHADA (fechar Rol requer execuções, que requerem obras do Cadastro). O bloqueio a nível de domínio existe no código (`Captacao.ValidarAberta()`), mas não pôde ser exercitado.

### CT-03 — UI ⚠️ LIMITADO
A troca de sessão (analista_identificacao → ilee para testes RN-08) impossibilitou o retorno ao dono para o teste UI do modal de exclusão. O fluxo via API (CT-01) confirma que o DELETE funciona; confirmação visual do modal com contagem de execuções não foi capturada.

### CT-06 — RN-08 ilee não-dono ⚠️ PASS c/ code drift
ilee tenta DELETE em captação de A → **bloqueado** com mensagem "Apenas o analista responsável pode modificar esta captação."
**Divergência:** HTTP **422** (atual) ≠ **403 FORBIDDEN** (documentado). Mesmo drift observado no RF-04.

---

## Observações

- O `api-contract.md` documenta que DELETE retorna `204 No Content` **sem body** — confirmado (204 sem resposta).
- O `api-contract.md` documenta que a exclusão de captação ABERTA remove também as execuções vinculadas — não verificado (captação não tinha execuções).
- Foi confirmado também DELETE de F_EDIT e F_FECHADA (via token A) retornando 204 — consistente.

---

## Resumo de Evidências

```
qa_task_05_excluir_captacao_aberta/
├── test_plan.md (incluído no arquivo combinado RF-04/05)
└── requests.log
```

---

## Informações para o Orquestrador

**Status final:** PASS c/ ressalvas
**Code drift RN-08:** 422 (atual) ≠ 403 (documentado) — mesmo do RF-04
**Não testável:** CT-02 (FECHADA) — depende de F02/F05
**Limitado:** CT-03 (UI modal) — perda de sessão após switch para ilee
