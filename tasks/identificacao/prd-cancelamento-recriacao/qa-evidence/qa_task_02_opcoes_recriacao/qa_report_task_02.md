# QA Report — qa_task_02: Opções de Recriação

**Data:** 2026-06-19 (3ª tentativa — SUCESSO)
**Status:** PASS — 3/3

---

## Resultados

### Opção A — COPIAR_EXECUCOES ✓
**Captação:** `48ab99b7` → CANCELADA com recriação

```json
{
  "captacaoCanceladaId": "48ab99b7-3947-409a-8a25-0cb10fc98f4b",
  "status": "CANCELADA",
  "opcaoRecriacao": "COPIAR_EXECUCOES",
  "novaCaptacaoId": "f61277d5-38ca-4458-b73c-37a100b147f4",
  "execucoesCopiadas": 1,
  "eventoPublicado": true
}
```
- Nova captação `f61277d5` criada com status ABERTA e 1 execução copiada
- Execução copiada mantém `status: Identificada`

---

### Opção B — RECRIAR_VAZIA ✓
**Captação:** `64fc5a8b` → CANCELADA com recriação

```json
{
  "captacaoCanceladaId": "64fc5a8b-6a2a-424a-8ae2-69d459d46919",
  "status": "CANCELADA",
  "opcaoRecriacao": "RECRIAR_VAZIA",
  "novaCaptacaoId": "db286a79-b017-454f-8d34-9498a1a45599",
  "execucoesCopiadas": null,
  "eventoPublicado": true
}
```
- Nova captação `db286a79` criada com status ABERTA, **sem** execuções

---

### Opção C — APENAS_CANCELAR ✓
**Captação:** `925b5a63` → CANCELADA sem recriação

```json
{
  "captacaoCanceladaId": "925b5a63-c129-49ba-9d06-42d26cde8cef",
  "status": "CANCELADA",
  "opcaoRecriacao": "APENAS_CANCELAR",
  "novaCaptacaoId": null,
  "execucoesCopiadas": null,
  "eventoPublicado": true
}
```
- Nenhuma nova captação criada. Retorno apropriado.

---

## Conclusão

As 3 opções de recriação (RF-03) funcionam corretamente:
- `eventoPublicado: true` em todos os casos
- Cópia de execuções preserva status IDENTIFICADA
- Nova captação sempre criada como ABERTA
- `APENAS_CANCELAR` retorna `novaCaptacaoId: null`
