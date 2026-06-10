# Plano de Testes — qa_task_02: Suspender Licença

## Contexto
- User Story: HU-02 — Suspender licença ATIVA (RF-07, RF-13)
- Ambiente: https://mcad.tasso.dev.br
- Autenticação: Logto OIDC PKCE (frontend)
- Tipo: UI + API
- Licença criada em qa_task_01: `78626f89-cb9b-4e79-abd9-d9b742769844` (status ATIVA)

## Casos de Teste

### CT-01 — Suspender licença ATIVA via API
- **Pré-condição:** Licença `78626f89-cb9b-4e79-abd9-d9b742769844` existe com status ATIVA
- **Passos:**
  1. POST /api/arrecadacao/v1/licencas/{id}/suspender
     Body: `{"justificativa": "Pendência financeira identificada — aguardando regularização"}`
  2. Assert HTTP 200 e response.status == "SUSPENSA"
  3. GET /api/arrecadacao/v1/licencas/{id}/historico-status
  4. Assert novo registro com statusAnterior="ATIVA", statusNovo="SUSPENSA", justificativa correspondente
- **Tipo:** API

### CT-02 — Tentar suspender licença já SUSPENSA
- **Pré-condição:** CT-01 executado com sucesso (mesma licença agora SUSPENSA)
- **Passos:**
  1. POST /api/arrecadacao/v1/licencas/{id}/suspender
     Body: `{"justificativa": "Tentativa de suspensão duplicada"}`
  2. Assert HTTP 422 e detail contém "Somente licenças ATIVAS podem ser suspensas"
- **Tipo:** API

### CT-03 — Tentar suspender com justificativa curta (< 10 chars)
- **Pré-condição:** Outra licença com status ATIVA existe no sistema
- **Passos:**
  1. GET /api/arrecadacao/v1/licencas?status=ATIVA para obter outro ID
  2. POST /api/arrecadacao/v1/licencas/{outro_id}/suspender
     Body: `{"justificativa": "curta"}`
  3. Assert HTTP 400 (erro de validação de tamanho mínimo)
- **Tipo:** API

### CT-04 — Frontend: botão "Suspender" visível para licença ATIVA
- **Pré-condição:** Usuário autenticado como Analista; licença ATIVA disponível
- **Passos:**
  1. Navegar para /arrecadacao/licencas
  2. Localizar e abrir detalhe de uma licença ATIVA (preferencialmente a da qa_task_01)
  3. Assert botão "Suspender" está visível
- **Evidência:** screenshots/ct04_suspend_button.png
- **Tipo:** UI

### CT-05 — Frontend: suspender via modal
- **Pré-condição:** CT-03 executado (a licença usada em CT-03 permanece ATIVA pois a suspensão falhou com 400)
- **Passos:**
  1. No detalhe da licença ATIVA, clicar em "Suspender"
  2. Assert modal abre com textarea para justificativa
  3. Preencher justificativa: "Pendência financeira identificada no contrato"
  4. Submeter
  5. Assert status da licença muda para "Suspensa" (badge amarelo)
- **Evidência:** screenshots/ct05_suspended.png
- **Tipo:** UI

## Ordem de Execução
1. CT-04 (verifica botão na licença A antes de suspender)
2. CT-01 (suspende licença A via API)
3. CT-02 (tenta suspender licença A novamente → erro)
4. CT-03 (lista licenças ATIVA, encontra licença B, tenta suspender com justificativa curta → erro 400)
5. CT-05 (usa licença B — ainda ATIVA após CT-03 — e suspende via UI)
