# QA Report — qa_task_06_campos_condicionais_rubrica

**Task ID:** qa_task_06  
**Status:** PASS (com ressalva)  
**Tipo:** API  
**RFs:** RF-09  
**Data:** 2026-06-20 (retest após correção B03)

---

## Resumo

A validação condicional por rubrica funciona para o caso principal (Rádio aceita sem tipo_utilizacao). Cinema com campos preenchidos também funciona. Porém, Cinema sem tipo_utilizacao não está sendo rejeitado (deveria gerar erro conforme RF-09 CT-1).

---

## Casos de Teste

### CT-A: Cinema com tipo_utilizacao=TA e titulo ✅ PASS
- Upload: Concluido, 1 execução, 0 erros
- Execução criada: tipoUtilizacao=TA, tituloPrograma="Filme Teste QA", status=Pendente

### CT-B: Cinema sem tipo_utilizacao ❌ FAIL (B04)

| Campo | Valor |
|-------|-------|
| Dado | Captação Cinema (`exigeClassificacao=true`), CSV sem `tipo_utilizacao` nem `titulo_programa` |
| Quando | Upload e processamento |
| Então (esperado) | Erro reportado na linha (RF-09 CT-1) |
| Actual | Concluido, 1 execução, 0 erros — aceitou sem validar |

**Evidência:**
```json
{"status":"Concluido","totalLinhas":1,"execucoesCriadas":1,"totalErros":0}
```
```json
{"data":[],"pagination":{"page":1,"size":50,"total":0,"totalPages":0}}
```

### CT-C: Rádio AM/FM sem tipo_utilizacao ✅ PASS
- Upload: Concluido, 1 execução, 0 erros
- Comportamento correto: rubrica não exige classificação

---

## Conclusão

| Requisito | Status |
|-----------|--------|
| RF-09 (Campos condicionais por rubrica) | ⚠️ PARCIAL |

| Caso | Resultado |
|------|-----------|
| Cinema com tipo_utilizacao e titulo preenchidos → aceito | ✅ |
| Rádio AM/FM sem tipo_utilizacao → aceito | ✅ |
| Cinema sem tipo_utilizacao → deveria rejeitar | ❌ B04 — aceito sem validação |

**B04 (novo):** Cinema (exigeClassificacao=true) não rejeita CSV sem `tipo_utilizacao`. A validação condicional da coluna `tipo_utilizacao` parece não estar sendo aplicada.
