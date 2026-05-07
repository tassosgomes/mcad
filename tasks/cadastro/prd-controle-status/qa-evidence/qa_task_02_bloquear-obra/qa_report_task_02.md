# QA Report — qa_task_02_bloquear-obra

**Status:** FAIL
**Data:** 2026-04-10
**Tipo:** API + DB

## User Story

Como analista, quero bloquear uma obra (PENDENTE ou LIBERADA) fornecendo justificativa, impedindo edições até o desbloqueio.

## Cenários Executados

### SC1 — Bloquear obra PENDENTE com justificativa válida (>10 chars)
- **Resultado:** PASS
- POST /obras/4b0a0174.../bloquear com justificativa "Conflito de titularidade pendente judicial"
- HTTP 200, status=BLOQUEADO, bloqueioJustificativa presente no response

### SC2 — Verificar status BLOQUEADO e justificativa via GET
- **Resultado:** FAIL
- GET /obras/{id} retorna `bloqueioJustificativa: null` mesmo após bloqueio bem-sucedido
- DB confirma `BloqueioJustificativa = 'Conflito de titularidade pendente judicial'`
- **BUG:** o campo `bloqueioJustificativa` não é retornado pelo endpoint GET /obras/{id}

### SC3 — Bloquear obra LIBERADA
- **Resultado:** PASS
- POST /obras/ec6f63e8.../bloquear → HTTP 200, status=BLOQUEADO

### SC4 — Bloquear com justificativa < 10 chars
- **Resultado:** PASS
- HTTP 400 com detail: "Justificativa deve ter no mínimo 10 caracteres."
- errors.Justificativa: ["Justificativa deve ter no mínimo 10 caracteres."]

### SC5 — Bloquear sem body
- **Resultado:** FAIL
- HTTP 500 retornado (Internal Server Error)
- Esperado: HTTP 400 (Bad Request)
- **BUG:** falta de body no endpoint bloquear retorna 500 em vez de 400

### SC6 — Bloquear obra DEPURADA
- **Resultado:** PASS
- HTTP 422 com detail: "Obras depuradas não podem ser bloqueadas"

### SC7 — DB verify historico_bloqueios
- **Resultado:** PASS
- Tabela cadastro.historico_bloqueios contém entrada com:
  - EntidadeId=4b0a0174..., EntidadeTipo=OBRA, Acao=BLOQUEIO
  - Justificativa="Conflito de titularidade pendente judicial"

### SC8 — Obra BLOQUEADA é read-only (PUT rejeita)
- **Resultado:** PASS
- PUT /obras/{id} em obra BLOQUEADA → HTTP 409 "Obras bloqueadas não podem ser editadas"

## Bugs Encontrados

### BUG-03 — GET /obras/{id} não retorna bloqueioJustificativa
- **Severidade:** Média
- **Descrição:** Após bloquear uma obra, o GET /obras/{id} retorna `bloqueioJustificativa: null` mesmo com o campo salvo no banco. O response do POST /bloquear retorna o campo corretamente.
- **Reprodução:** POST /bloquear → verifica response (ok) → GET /obras/{id} → campo null

### BUG-04 — POST /bloquear sem body retorna HTTP 500
- **Severidade:** Média
- **Descrição:** Enviar POST /obras/{id}/bloquear sem body resulta em HTTP 500 "Required parameter 'BloquearObraCommand commandArgs' was not provided from body." Deveria retornar 400.
- **Impacto:** Expõe detalhe interno de implementação em resposta de erro de cliente.

## Evidências DB

```sql
SELECT "Id", "Status", "BloqueioJustificativa" FROM cadastro.obras_musicais
WHERE "Id" IN ('4b0a0174...', 'ec6f63e8...');
-- 4b0a0174 | BLOQUEADO | Conflito de titularidade pendente judicial
-- ec6f63e8 | BLOQUEADO | Disputa judicial sobre direitos autorais

SELECT "Acao", "Justificativa", "DataHora" FROM cadastro.historico_bloqueios
WHERE "EntidadeId" = '4b0a0174...';
-- BLOQUEIO | Conflito de titularidade pendente judicial | 2026-04-11T03:41:55
```

## Resultado Final

**FAIL** — BUG-03 (GET não retorna bloqueioJustificativa) e BUG-04 (sem body retorna 500). O comportamento de bloqueio em si está correto.
