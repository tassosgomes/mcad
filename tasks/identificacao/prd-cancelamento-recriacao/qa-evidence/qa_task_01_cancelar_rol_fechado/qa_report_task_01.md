# QA Report — qa_task_01: Cancelamento de Rol Fechado

**Data:** 2026-06-19 (nova tentativa)  
**Ambiente:** Frontend `https://mcad.tasso.dev.br` | Backend `https://mcad-identificacao.tasso.dev.br/api/v1`  
**Usuário:** Analista Identificacao (`analista_identificacao`)

---

## Resumo

| Status | Cenários |
|--------|----------|
| PASS | 3 / 7 |
| BLOCKED | 4 / 7 |
| FAIL | 0 / 7 |

---

## Resultados por Cenário

### Cenário 1 — Login com analista_identificacao
**Status:** PASS (confirmado nas 2 execuções)

Login OIDC via Logto funcional. Sessão autenticada com identidade "Analista Identificacao" / `identificacao.default.analista`.

---

### Cenário 2 — Botão "Cancelar Rol" visível em captação FECHADA
**Status:** BLOCKED — Sem dados de teste (confirmado nas 2 execuções)

0 captações FECHADA no sistema. 0 resultados via API `?status=FECHADA`.

**Detalhe adicional:** O botão "Fechar Rol" agora aparece na CaptacaoDetailPage para captações ABERTA, mas o fechamento falha sem execuções.

---

### Cenário 3 — Cancelar com justificativa válida
**Status:** BLOCKED — Sem dados de teste

O endpoint `POST /cancelar` existe e responde, mas requer captação FECHADA.

Não foi possível criar uma captação FECHADA porque:
1. `POST /fechar` retorna 422: "Nenhuma execução registrada"
2. Não é possível criar execuções: API de busca de obras (`/api/cadastro/v1/busca`) retorna 403 Forbidden (permissões insuficientes para o analista)
3. CSV import falha: background worker retorna 401 ao consultar Cadastro API

---

### Cenário 4 — Justificativa vazia ou < 10 chars
**Status:** PASS (confirmado nas 2 execuções)

| Sub-cenário | Endpoint | Status HTTP | Validação |
|-------------|----------|-------------|-----------|
| Justificativa vazia | POST /cancelar | 400 | `'justificativa' must not be empty` + `length >= 10` |
| Justificativa curta (9 chars) | POST /cancelar | 400 | `length >= 10, entered 9` |
| Justificativa válida (39 chars) em ABERTA | POST /cancelar | 422 | `Apenas captações FECHADAS podem ser canceladas` |

---

### Cenário 5 — Captação ABERTA — botão não visível
**Status:** PASS (confirmado nas 2 execuções)

Na CaptacaoDetailPage de captação ABERTA:
- Botões visíveis: "Fechar Rol", "Excluir", "Adicionar Execução", "Importar CSV"
- **"Cancelar Rol" NÃO visível** — comportamento correto
- `GET /pode-cancelar` retorna `podeCancelar: false`, motivo: "Apenas captações FECHADAS podem ser canceladas."

---

### Cenário 6 — Captação já CANCELADA — botão não visível
**Status:** BLOCKED (confirmado nas 2 execuções)

0 captações CANCELADA no sistema. Impossível verificar regra.

---

### Cenário 7 — Bloqueio por distribuição (`distribuicaoProcessada = true`)
**Status:** BLOCKED (confirmado nas 2 execuções)

Todas as 4 captações retornam `distribuicaoProcessada: false`. O endpoint `pode-cancelar` retorna o campo `motivo` que seria usado como tooltip, mas sem nenhuma captação processada.

---

## Testes de API Adicionais (nova tentativa)

### GET `/pode-cancelar` — 4 captações
Todas retornam 200 com `podeCancelar: false`, `distribuicaoProcessada: false`. Consistente.

### POST `/fechar` (backend direto)
`POST .../captacoes/925b5a63.../fechar` → **422**
```json
{"detail":"Nenhuma execução registrada","code":"min_execucoes","itens":[{"id":"min_execucoes","atendido":false,"detalhe":"Nenhuma execução registrada"},{"id":"zero_pendentes","atendido":true},{"id":"obras_liberadas","atendido":true}]}
```
Validação de fechamento funciona corretamente (requer >= 1 execução).

### CSV Import
Upload aceito (toast "Upload iniciado"), mas processamento falha:
```
Status: Erro
Mensagem: "Erro interno no processamento: Response status code does not indicate success: 401 (Unauthorized)."
```
Worker não consegue autenticar na Cadastro API para verificar ISRC.

### Busca de obras
`GET .../api/cadastro/v1/busca?q=amor` → **403 Forbidden**
Analista de identificação não tem permissão para acessar API de Cadastro via BFF.

---

## Análise dos Bloqueios

| Bloqueio | Causa Raiz | Impacto |
|----------|-----------|---------|
| Sem FECHADA | Fechar requer >= 1 execução | Bloqueia cenários 2, 3 |
| Sem execuções | Worker CSV não autentica no Cadastro (401) | Bloqueia criação de dados |
| Sem acesso Cadastro | BFF retorna 403 para `/api/cadastro/v1/busca` | Impede adição manual |
| Sem CANCELADA | Nenhum cancelamento bem-sucedido | Bloqueia cenário 6 |
| Sem distribuição processada | RF-04 consumer não implementado/ativado | Bloqueia cenário 7 |

---

## Evidências

- `screenshots/01_aberta_no_cancelar_rol_button.png` — Captação ABERTA sem botão Cancelar Rol
- `requests.log` — Log de todas as requisições API
- Captura de tela do upload CSV com toast "Upload iniciado"
- Response do upload: status "Erro" com detalhe 401
