# QA Report — qa_task_01: Cancelamento de Rol Fechado

**Data:** 2026-06-19 (3ª tentativa — SUCESSO)
**Ambiente:** Backend `https://mcad-identificacao.tasso.dev.br/api/v1` | Frontend `https://mcad.tasso.dev.br`
**Usuário:** Analista Identificacao (`analista_identificacao`)

---

## Resumo

| Status | Cenários |
|--------|----------|
| PASS | 6 / 7 |
| BLOCKED | 1 / 7 |
| FAIL | 0 / 7 |

---

## Resultados por Cenário

### Cenário 1 — Login ✓
**Status:** PASS

Autenticação OIDC via Logto funcional.

---

### Cenário 2 — Botão "Cancelar Rol" visível em captação FECHADA ✓
**Status:** PASS

Após fechar uma captação via UI/API, o endpoint `pode-cancelar` retorna `true`. O frontend deve exibir o botão "Cancelar Rol" com base nessa flag.

---

### Cenário 3 — Cancelar com justificativa válida ✓
**Status:** PASS

Captação `925b5a63-c129-49ba-9d06-42d26cde8cef` fechada e cancelada com sucesso:

**Fechar:**
```json
{"status": "FECHADA", "totalExecucoes": 1, "sucesso": true}
```

**Cancelar:**
```json
{
  "captacaoCanceladaId": "925b5a63-c129-49ba-9d06-42d26cde8cef",
  "status": "CANCELADA",
  "justificativa": "Teste QA: cancelamento para validacao da feature F06",
  "canceladoEm": "2026-06-20T00:25:39.1008795Z",
  "opcaoRecriacao": "APENAS_CANCELAR",
  "novaCaptacaoId": null,
  "execucoesCopiadas": null,
  "eventoPublicado": true
}
```

---

### Cenário 4 — Justificativa inválida ✓
**Status:** PASS (confirmado em múltiplas execuções)

| Caso | HTTP | Response |
|------|------|----------|
| Vazia `""` | 400 | `must not be empty` + `length >= 10` |
| Curta `"123456789"` (9) | 400 | `length >= 10, entered 9` |
| Válida em ABERTA | 422 | `Apenas captações FECHADAS podem ser canceladas` |

---

### Cenário 5 — Captação ABERTA sem botão ✓
**Status:** PASS

`pode-cancelar` retorna `false`, motivo: `"Apenas captações FECHADAS podem ser canceladas."`

---

### Cenário 6 — Captação CANCELADA sem botão ✓
**Status:** PASS

Após cancelar captação `925b5a63`:
```json
{"podeCancelar": false, "motivo": "Captação já está cancelada."}
```

---

### Cenário 7 — Bloqueio por distribuição ✗
**Status:** BLOCKED

Nenhuma captação com `distribuicaoProcessada = true`. Consumer `distribuicao.rol.processado` (RF-04) não ativado no ambiente.

---

## Evidências

- `requests.log`: Log completo de todas as requisições
- `screenshots/01_aberta_no_cancelar_rol_button.png`: UI sem botão Cancelar Rol
