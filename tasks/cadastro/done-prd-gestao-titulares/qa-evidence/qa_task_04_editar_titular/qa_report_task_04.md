# QA Report — Task 04: Editar Titular

**Task ID:** qa_task_04
**User Story:** HU-04 — Editar titular — campos mutáveis, tipo e documento imutáveis
**Data de execução:** 2026-04-08 (3a re-execução — API PID 10137, binário atualizado)
**Executado por:** QA Orchestrator
**Status geral:** PASS

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de TCs | 7 |
| PASS | 7 |
| FAIL | 0 |
| Cobertura | RF-10, RF-11, RF-12, RF-22 |

---

## Casos de Teste

### TC04-01 — Atualizar associação via PUT (BUG-04-01 revalidado)
**Tipo:** API
**Status:** PASS
**Descrição:** PUT com `nome="QA Titular T04 Revalidado"`, `associacaoId={SBACEM}`, `caeIpi="CAE12345"` — associação deve ser atualizada para SBACEM.
**Evidência:**
- Titular criado via POST: ID `8f445fc6-80ea-49f4-b744-b5972820bbdb`, associação inicial ABRAMUS
- PUT com `associacaoId=d4e5f6a7-b8c9-0123-defa-234567890123` (SBACEM)
- HTTP 200 (correto)
- `nome`: `QA Titular T04 Revalidado` — atualizado
- `caeIpi`: `CAE12345` — atualizado
- `associacao.sigla`: `SBACEM` — **atualizado corretamente**
- `atualizadoEm`: `2026-04-08T23:55:47.837822Z` (timestamp reflete a edição)
- **BUG-04-01 CORRIGIDO:** Associação agora é persistida corretamente pelo PUT

---

### TC04-02 — Persistência da edição no banco (BUG-04-01 revalidado)
**Tipo:** API (GET subsequente)
**Status:** PASS
**Descrição:** GET após PUT para verificar persistência da associação SBACEM.
**Evidência:**
- GET `http://localhost:5001/api/v1/titulares/8f445fc6-80ea-49f4-b744-b5972820bbdb`
- HTTP 200
- `associacao.sigla`: `SBACEM`
- `associacao.id`: `d4e5f6a7-b8c9-0123-defa-234567890123`
- `atualizadoEm`: `2026-04-08T23:55:47.837822Z` (persistido)
- **BUG-04-01 CORRIGIDO:** Persistência confirmada — o banco reflete a mudança de associação

---

### TC04-03 — Alterar status para FALECIDO
**Tipo:** API
**Status:** PASS
**Evidência:**
- HTTP 200
- `status`: `FALECIDO` (RF-12)

---

### TC04-04 — Alterar status para TRANSFERINDO
**Tipo:** API
**Status:** PASS
**Evidência:**
- HTTP 200
- `status`: `TRANSFERINDO` (RF-12)

---

### TC04-05 — PUT em ID inexistente
**Tipo:** API
**Status:** PASS
**Evidência:**
- HTTP 404 (RF-22)
- `detail`: `"Titular com ID 'f47ac10b-58cc-4372-a567-000000000099' não foi encontrado"` (mensagem em português)
- Comportamento de 404 correto; mensagem agora em português (BUG-05-01 também corrigido)

---

### TC04-06 — UUID todos zeros via PUT (BUG-04-02 revalidado)
**Tipo:** API
**Status:** PASS
**Descrição:** PUT /titulares/00000000-0000-0000-0000-000000000000 — deve retornar 404.
**Evidência:**
- HTTP 404 (obtido)
- HTTP 404 (esperado)
- `detail`: `"Titular com ID '00000000-0000-0000-0000-000000000000' não foi encontrado"`
- **BUG-04-02 CORRIGIDO:** O validator não mais rejeita Guid.Empty com 400. O 404 é tratado pelo repositório, consistente com GET e DELETE.

---

### TC04-07 — Imutabilidade de tipo e documento
**Tipo:** API
**Status:** PASS
**Descrição:** PUT enviando `tipo="PJ"` e `documento="99999999999"` no body — campos devem ser ignorados.
**Evidência:**
- HTTP 200
- `tipo`: `PF` (imutável — RF-11)
- `documento`: `52998224725` (imutável — RF-11)
- Campos `tipo` e `documento` corretamente ignorados pelo PUT

---

## Bugs Revalidados

### BUG-04-01 — Associação não atualizada pelo PUT
**Severidade:** Alta
**Status:** CORRIGIDO
**Resolução:** `AtualizarTitularCommandHandler` agora usa `GetByIdForUpdateAsync` (EF Core tracking) em vez de `GetByIdAsync` (no-tracking). A entidade rastreada permite que o EF Core detecte e persista a mudança de `AssociacaoId`.
**Evidência de correção:** PUT com SBACEM retorna HTTP 200 e `associacao.sigla: SBACEM`. GET subsequente confirma persistência no banco.

### BUG-04-02 — UUID zeros retorna 400 no PUT
**Severidade:** Baixa
**Status:** CORRIGIDO
**Resolução:** Validação de `Guid.Empty` removida do `AtualizarTitularCommandValidator`. O fluxo agora passa pelo repositório, que retorna 404 quando o ID não existe — comportamento consistente com GET e DELETE.
**Evidência de correção:** PUT /titulares/00000000-0000-0000-0000-000000000000 retorna HTTP 404.

---

## Conclusão

Task 04: 7/7 TCs passaram. Todos os bugs anteriores (BUG-04-01 e BUG-04-02) foram corrigidos e validados com o binário atual (PID 10137). A feature de edição de titulares está completamente operacional: atualização de campos mutáveis (nome, associação, status, caeIpi), imutabilidade de tipo e documento, e tratamento correto de 404 para IDs inexistentes incluindo UUID zeros.
