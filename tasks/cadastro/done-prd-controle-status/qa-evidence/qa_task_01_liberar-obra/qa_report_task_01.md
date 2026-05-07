# QA Report — qa_task_01_liberar-obra

**Status:** FAIL
**Data:** 2026-04-10
**Tipo:** API + DB

## User Story

Como analista, quero liberar uma obra musical para que ela passe ao status LIBERADO após atender todos os pré-requisitos (título, tipo, ISWC, titularidades = 100%).

## Cenários Executados

### SC1 — Criar obra PENDENTE com título e tipo
- **Resultado:** PASS
- Obra criada: `4b0a0174-7882-4c79-9b86-d4f53d2a659f` (código 44, tipo MUSICAL, status PENDENTE)

### SC2 — Adicionar titularidades somando 100%
- **Resultado:** PASS
- Titularidades adicionadas: AUTOR 70% (Tasso Silva Gomes) + EDITOR 30% (Editora de Teste)
- GET /titularidades confirma somaPercentual=100.0000, somaCompleta=true
- Nota: o response do POST /titularidades retorna campos `titularId`, `categoria`, `percentual` como `null` (apenas id interno), mas a criação ocorre corretamente (confirmado via GET)

### SC3 — Liberar sem ISWC (espera 422)
- **Resultado:** PASS
- HTTP 422 retornado com pendencias[]: ISWC atendido=false, Titularidades atendido=true
- **BUG ENCONTRADO:** pendencia `Tipo` retornou `atendido: false` para obra com tipo=MUSICAL

### SC4 — Liberar obra completa (ISWC + titularidades + tipo != Musical)
- **Resultado:** PASS (com workaround)
- Nova obra com tipo=LITEROMUSICAL criada: `ec6f63e8-1553-430e-8827-43c4c9bfae0d`
- ISWC injetado via DB: `T-000456789-0`
- POST /liberar → HTTP 200, status=LIBERADO
- **WORKAROUND NECESSÁRIO:** bug no ValidadorLiberacaoObra.cs impede liberação de obras com tipo=MUSICAL

### SC5 — Liberar obra já LIBERADA (espera 409)
- **Resultado:** PASS
- HTTP 409 com detail: "Apenas obras PENDENTES podem ser liberadas."

### SC6 — Liberar obra incompleta (sem ISWC, titularidades=80%)
- **Resultado:** PASS
- HTTP 422 com pendencias[]: ISWC=false ("ISWC não obtido"), Titularidades=false ("Soma (80.0000%) diferente de 100%")

### SC7 — DB verify status=LIBERADO
- **Resultado:** PASS
- `SELECT Status FROM cadastro.obras_musicais WHERE Id = 'ec6f63e8...'` → Status='LIBERADO'

## Bugs Encontrados

### BUG-01 — ValidadorLiberacaoObra: tipo MUSICAL tratado como "não preenchido"
- **Severidade:** Alta
- **Descrição:** `ValidadorLiberacaoObra.cs` linha 12: `obra.Tipo != default` falha para `TipoObra.Musical` pois `Musical` é o valor zero do enum (valor padrão C#). Obras com tipo MUSICAL nunca podem ser liberadas pelo endpoint.
- **Reprodução:** Criar obra tipo=MUSICAL, adicionar titularidades=100%, obter ISWC → POST /liberar → 422 com `Tipo: atendido: false`
- **Arquivo:** `services/cadastro-api/3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoObra.cs:12`

### BUG-02 — Response do POST /titularidades retorna campos como null
- **Severidade:** Baixa (cosmética — a criação ocorre corretamente)
- **Descrição:** O response de POST /obras/{id}/titularidades retorna `{"titularId": null, "categoria": null, "percentual": null}` mas a titularidade é criada no banco.
- **Impacto:** Clientes da API não conseguem confirmar a criação pelo response.

## Evidências DB

```sql
SELECT "Id", "Titulo", "Status", "Iswc" FROM cadastro.obras_musicais
WHERE "Id" = 'ec6f63e8-1553-430e-8827-43c4c9bfae0d';
-- Id: ec6f63e8... | Titulo: QA F07 Liberar Obra LITEROMUSICAL | Status: LIBERADO | Iswc: T-000456789-0
```

## Resultado Final

**FAIL** — BUG-01 impede a liberação de obras com tipo=MUSICAL (o tipo mais comum). O fluxo funciona com LITEROMUSICAL como workaround.
