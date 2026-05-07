# QA Report — Task 05: Visualizar Titular

**Task ID:** qa_task_05
**User Story:** HU-05 — Visualizar detalhe (Consultor read-only), 404 para ID inexistente
**Data de execução:** 2026-04-08 (3a re-execução — API PID 10137, binário atualizado)
**Executado por:** QA Orchestrator
**Status geral:** FAIL (1 TC secundário de routing — sem impacto em regras de negócio)

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de TCs | 5 |
| PASS | 4 |
| FAIL | 1 |
| Cobertura | RF-21, RF-22 |

---

## Casos de Teste

### TC05-01 — GET por ID existente (Analista)
**Tipo:** API
**Status:** PASS
**Evidência:**
- GET `http://localhost:5001/api/v1/titulares/8f445fc6-80ea-49f4-b744-b5972820bbdb`
- HTTP 200
- Todos os campos presentes: `id`, `codigo`, `nome`, `tipo`, `documento`, `documentoFormatado`, `nacionalidade`, `caeIpi`, `associacao`, `status`, `criadoEm`, `atualizadoEm`
- `documentoFormatado`: `529.982.247-25` (formatação CPF correta)
- `criadoEm` e `atualizadoEm` presentes (RF-21)

---

### TC05-02 — GET por ID existente (Consultor)
**Tipo:** API
**Status:** PASS
**Evidência:**
- HTTP 200 com token do perfil Consultor
- `nome`: `QA Titular T04 Revalidado`, `associacao.sigla`: `SBACEM`
- Consultor tem acesso de leitura (HU-05)

---

### TC05-03 — GET com ID inexistente — mensagem em português (BUG-05-01 revalidado)
**Tipo:** API
**Status:** PASS
**Descrição:** GET /titulares/{id_inexistente} deve retornar 404 com mensagem em português.
**Evidência:**
- HTTP 404 (correto)
- `detail`: `"Titular com ID 'f47ac10b-58cc-4372-a567-000000000099' não foi encontrado"` (em português)
- **BUG-05-01 CORRIGIDO:** Mensagem agora em português ("não foi encontrado")

---

### TC05-04 — GET UUID zeros
**Tipo:** API
**Status:** PASS
**Descrição:** GET /titulares/00000000-0000-0000-0000-000000000000 deve retornar 404.
**Evidência:**
- HTTP 404 (correto)
- `detail`: `"Titular com ID '00000000-0000-0000-0000-000000000000' não foi encontrado"` (em português)
- Comportamento de status HTTP correto; mensagem em português

---

### TC05-05 — GET com string não-UUID
**Tipo:** API
**Status:** FAIL
**Descrição:** GET /titulares/nao-e-uuid — esperado 400 (UUID inválido), obtido 404.
**Evidência:**
- HTTP 404 (obtido)
- HTTP 400 (esperado para UUID inválido)
- O route constraint `{id:guid}` do ASP.NET Minimal API não está rejeitando strings não-UUID com 400. A string inválida não corresponde a nenhuma rota e resulta em 404.
- **Nota:** Comportamento secundário sem impacto direto nas regras de negócio RF-21/RF-22. Comportamento inalterado em relação às execuções anteriores. Avaliação de criticidade fica a critério do product owner.

---

## Bugs Revalidados

### BUG-05-01 — Mensagem 404 em inglês
**Severidade:** Baixa
**Status:** CORRIGIDO
**Resolução:** `NotFoundException.cs` atualizado para gerar mensagem em português: `"Titular com ID '{id}' não foi encontrado"`. O binário atual (PID 10137) carrega a correção.
**Evidência de correção:** GET com ID inexistente retorna `detail: "Titular com ID '...' não foi encontrado"` (português). Mesma mensagem em português observada no TC04-05 e TC04-06 do PUT.

---

## Conclusão

Task 05: 4/5 TCs passaram. O BUG-05-01 (mensagem 404 em inglês) foi corrigido e validado. O TC05-05 (string não-UUID retorna 404 ao invés de 400) permanece como comportamento do framework — sem alteração e sem impacto nas regras RF-21 e RF-22. A funcionalidade principal de visualização está completamente operacional: GET retorna todos os campos esperados, Consultor tem acesso de leitura, e IDs inexistentes (incluindo UUID zeros) retornam 404 com mensagem em português.
