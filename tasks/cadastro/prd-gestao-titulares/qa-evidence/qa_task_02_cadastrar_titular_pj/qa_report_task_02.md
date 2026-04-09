# QA Report — Task 02: Cadastrar Titular Pessoa Jurídica

**Task ID:** qa_task_02  
**User Story:** HU-02 — Cadastrar titular pessoa jurídica — CNPJ alfanumérico RFB + retrocompatibilidade numérica  
**Data de execução:** 2026-04-08  
**Executado por:** QA Orchestrator (re-execução pós-correção de bugs)  
**Status geral:** PASS

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de TCs | 7 |
| PASS | 7 |
| FAIL | 0 |
| Cobertura | RF-01, RF-03, RF-04, RF-05, RF-06, RF-08 |

---

## Casos de Teste

### TC02-01 — Criar PJ com CNPJ alfanumérico 1 (HM.752.2MH/0001-02)
**Tipo:** API  
**Status:** PASS  
**Descrição:** POST com CNPJ alfanumérico real da RFB `HM7522MH000102`.  
**Evidência:**
- HTTP 201 Created
- ID: `b4c692c3-f159-4721-b833-4b4d724348aa`
- `documentoFormatado`: `HM.752.2MH/0001-02` (formatação alfanumérica correta)
- `status`: `ATIVO`

---

### TC02-02 — Criar PJ com CNPJ alfanumérico 2 (GW.2TW.72R/0001-35)
**Tipo:** API  
**Status:** PASS  
**Descrição:** POST com CNPJ alfanumérico `GW2TW72R000135`.  
**Evidência:**
- HTTP 201 Created
- ID: `003563c4-4781-4594-8eb4-15439367f4a2`
- `documentoFormatado`: `GW.2TW.72R/0001-35`

---

### TC02-03 — Criar PJ com CNPJ alfanumérico 3 (KY.4K2.B3A/0001-80)
**Tipo:** API  
**Status:** PASS  
**Descrição:** POST com CNPJ alfanumérico `KY4K2B3A000180`.  
**Evidência:**
- HTTP 201 Created
- ID: `ce937bd3-8fef-46a9-b979-fd9505d39e74`
- `documentoFormatado`: `KY.4K2.B3A/0001-80`

---

### TC02-04 — CNPJ numérico legado (retrocompatibilidade)
**Tipo:** API  
**Status:** PASS  
**Descrição:** POST com CNPJ numérico `11222333000181`.  
**Evidência:**
- HTTP 201 Created
- ID: `500bbe2d-ed25-4a0b-bc11-426772e12f17`
- `documentoFormatado`: `11.222.333/0001-81` (formato numérico legacy)
- RF-03 retrocompatibilidade confirmada

---

### TC02-05 — CNPJ inválido (dígitos verificadores errados)
**Tipo:** API  
**Status:** PASS  
**Descrição:** POST com CNPJ `11222333000199` (dígitos verificadores incorretos).  
**Evidência:**
- HTTP 422 Unprocessable Entity
- `detail`: `"CNPJ inválido"` (RF-03, RF-04)

---

### TC02-06 — CNPJ duplicado
**Tipo:** API  
**Status:** PASS  
**Descrição:** Tentativa de criar segundo PJ com CNPJ `HM7522MH000102` já existente.  
**Evidência:**
- HTTP 409 Conflict
- `detail`: `"Já existe um titular cadastrado com este PJ: HM.752.2MH/0001-02"` (RF-05)
- Mensagem em português

---

### TC02-07 — documentoFormatado alfanumérico no response
**Tipo:** API  
**Status:** PASS  
**Descrição:** Verificar que CNPJ alfanumérico é formatado corretamente no response.  
**Evidência:**
- `documentoFormatado`: `HM.752.2MH/0001-02` — pontuação aplicada nas posições corretas (`.` e `/`)

---

## Dados Criados (para uso em tasks posteriores)

| Variável | Valor | CNPJ |
|----------|-------|------|
| PJ_ID_01 | `b4c692c3-f159-4721-b833-4b4d724348aa` | HM7522MH000102 |
| PJ_ID_02 | `003563c4-4781-4594-8eb4-15439367f4a2` | GW2TW72R000135 |
| PJ_ID_03 | `ce937bd3-8fef-46a9-b979-fd9505d39e74` | KY4K2B3A000180 |
| PJ_ID_04 | `500bbe2d-ed25-4a0b-bc11-426772e12f17` | 11222333000181 |

---

## Bugs Identificados

Nenhum novo bug encontrado nesta task.

---

## Conclusão

HU-02 completamente validada. O algoritmo de validação de CNPJ alfanumérico (módulo 11 com ASCII - 48) está funcionando corretamente para os 3 CNPJs reais fornecidos pela RFB. A retrocompatibilidade com CNPJs numéricos foi confirmada. A formatação do `documentoFormatado` aplica corretamente os separadores na posição certa para CNPJs alfanuméricos.
