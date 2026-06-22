# QA Report — qa_task_04_agrupamento_duplicatas

**Task ID:** qa_task_04  
**Status:** PASS  
**Tipo:** API  
**RFs:** RF-04, RF-05  
**Data:** 2026-06-20 (retest após correção B03)

---

## Resumo

Com a correção do B03 (ISRC desconhecido → PENDENTE), o agrupamento e a detecção de duplicatas funcionam conforme especificado. 3 linhas idênticas são agrupadas em 1 execução com quantidade=3. ISRC com horário divergente gera erro.

---

## Casos de Teste

### CT-01: Agrupamento de linhas idênticas ✅ PASS

| Campo | Valor |
|-------|-------|
| Dado | CSV com 3 linhas idênticas: ISRC `BRXX99999999`, horário `14:30:00-14:33:45` |
| Quando | Upload e processamento |
| Então | 1 execução criada com `quantidade = 3`, status Pendente |

**Evidência:**
```
Upload: adef98ec (ConcluidoComErros, totalLinhas:4, execucoesCriadas:1, totalErros:1)
Execução: ISRC=BRXX99999999 inicio=14:30:00 qtd=3 status=Pendente
```

### CT-02: ISRC com horário divergente → erro ✅ PASS

| Campo | Valor |
|-------|-------|
| Dado | Linha 4 com mesmo ISRC mas horário `15:00-15:03` (diferente de `14:30-14:33`) |
| Quando | Processamento |
| Então | Erro: "ISRC BRXX99999999 já registrado com horário diferente (linha 2)" |

**Evidência:**
```json
{"data":[{"linha":5,"coluna":"isrc","mensagem":"ISRC BRXX99999999 já registrado com horário diferente (linha 2)"}]}
```

---

## Conclusão

| Requisito | Status |
|-----------|--------|
| RF-04 (Agrupamento de linhas idênticas) | ✅ PASS |
| RF-05 (Detecção ISRC duplicado com horários divergentes) | ✅ PASS |
