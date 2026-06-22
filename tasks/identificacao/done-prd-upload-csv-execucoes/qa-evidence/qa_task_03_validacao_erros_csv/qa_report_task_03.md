# QA Report — qa_task_03_validacao_erros_csv

**Task ID:** qa_task_03  
**Status:** PASS  
**Tipo:** API  
**RFs:** RF-03, RF-08  
**Data:** 2026-06-20 (retest após correções)

---

## Resumo

A validação linha a linha funciona. O endpoint de erros foi corrigido e agora retorna os erros com linha, coluna e mensagem descritiva. Contagem de erros consistente.

---

## Casos de Teste

### CT-01: CSV com erros → CONCLUIDO_COM_ERROS ✅ PASS
CSV com 3 erros (sem identificador, hora inválida, fim < início):
```json
{"status":"ConcluidoComErros","totalLinhas":3,"execucoesCriadas":0,"totalErros":3}
```

### CT-02: Relatório de erros (retest B02) ✅ PASS
GET `/captacoes/{id}/uploads/{uploadId}/erros` retorna:
```json
{
  "data": [
    {"linha": 2, "coluna": "isrc/iswc", "mensagem": "Ao menos um identificador (ISRC ou ISWC) é obrigatório"},
    {"linha": 3, "coluna": "inicio", "mensagem": "Formato de hora inválido. Esperado HH:mm:ss"},
    {"linha": 4, "coluna": "fim", "mensagem": "Horário de fim deve ser posterior ao início"}
  ],
  "pagination": {"page": 1, "size": 50, "total": 3, "totalPages": 1}
}
```

### CT-03: Header inválido → Erro global ✅ PASS
- "Colunas obrigatórias ausentes"

---

## Conclusão

| Requisito | Status |
|-----------|--------|
| RF-03 (Validação linha a linha) | ✅ PASS |
| RF-08 (Visualização do relatório de erros) | ✅ PASS |
