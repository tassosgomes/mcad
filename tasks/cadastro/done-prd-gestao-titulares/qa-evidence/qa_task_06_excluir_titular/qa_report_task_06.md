# QA Report — Task 06: Excluir Titular

**Task ID:** qa_task_06  
**User Story:** RF-23/RF-24 — Exclusão de titular sem vínculos (sucesso) e com vínculos (409)  
**Data de execução:** 2026-04-08  
**Executado por:** QA Orchestrator (re-execução pós-correção de bugs)  
**Status geral:** PASS

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de TCs | 5 |
| PASS | 5 |
| FAIL | 0 |
| Cobertura | RF-23, RF-24 |

---

## Casos de Teste

### TC06-01 — DELETE titular sem vínculos
**Tipo:** API  
**Status:** PASS  
**Descrição:** DELETE /titulares/{id} para titular recém-criado sem vínculos com obras ou fonogramas.  
**Evidência:**
- HTTP 204 No Content (RF-24)
- Body vazio (correto)
- Titular criado especificamente para este teste com CPF `44556677840`

---

### TC06-02 — Verificar remoção (GET após DELETE)
**Tipo:** DB  
**Status:** PASS  
**Descrição:** GET /titulares/{id} do titular excluído deve retornar 404.  
**Evidência:**
- HTTP 404 (exclusão física confirmada no banco)

---

### TC06-03 — DELETE titular COM vínculos
**Tipo:** API  
**Status:** PASS  
**Descrição:** DELETE de titular vinculado a obras/fonogramas (titular com vínculos confirmados no cleanup inicial).  
**Evidência:**
- HTTP 409 Conflict (RF-23)
- `detail`: `"Titular não pode ser excluído pois possui vínculos com obras ou fonogramas"`
- Mensagem em português (correto)
- Proteção de integridade referencial funcionando

---

### TC06-04 — DELETE em ID inexistente
**Tipo:** API  
**Status:** PASS  
**Evidência:**
- HTTP 404 (correto)

---

### TC06-05 — UUID zeros via DELETE (BUG-04-02)
**Tipo:** API  
**Status:** PASS  
**Descrição:** DELETE /titulares/00000000-0000-0000-0000-000000000000 deve retornar 404 (não 400).  
**Evidência:**
- HTTP 404 (BUG-04-02 corrigido para DELETE)
- `detail`: `"Titular with ID '00000000-0000-0000-0000-000000000000' was not found."`

---

## Bugs Identificados

Nenhum novo bug encontrado nesta task.

**Observação sobre BUG-04-02:** Para DELETE, o UUID zeros já retorna 404 corretamente. A inconsistência permanece apenas no PUT (que retorna 400).

---

## Conclusão

RF-23 e RF-24 completamente validados. A exclusão permanente de titular sem vínculos (204) e a proteção de integridade referencial para titular com vínculos (409, mensagem em PT-BR) estão funcionando corretamente. O BUG-04-02 está corrigido para GET e DELETE.
