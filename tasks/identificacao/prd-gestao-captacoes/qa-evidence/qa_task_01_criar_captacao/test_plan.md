# Plano de Testes — qa_task_01 Criar Captação (RF-01)

**User Story:** RF-01 — Criar Captação
**Tipos:** API + UI
**Usuário:** analista_identificacao (user_a, sub `jrc0vems4r1q`)

## Rubricas (seed)
- RADIO `b1a2c3d4-0001-0000-0000-000000000001` (exigeClassificacao: false)
- STREAMING_AUDIO `b1a2c3d4-0001-0000-0000-000000000006` (exigeClassificacao: false)

## Casos de Teste

### CT-01 (API) — Criar captação válida
- Pre: período único não usado (2026-06-19, RADIO)
- Passos: POST /captacoes {rubricaId RADIO, periodo 2026-06-19, usuarioDeMusica "QA-F01-Criar-Valida"}
- Expected: 201; status="ABERTA"; analistaResponsavel preenchido com sub do token; id retornado

### CT-02 (API) — Duplicidade rubrica+período (RN-01)
- Pre: CT-01 executado (existe captação ativa RADIO 2026-06-19)
- Passos: POST /captacoes mesmo rubricaId+periodo
- Expected: 409; code CAPTACAO_DUPLICADA; detail com nome da rubrica e período

### CT-03 (API) — Campos obrigatórios ausentes (RF-01.3)
- Passos: POST /captacoes {} (body vazio) e também {rubricaId válido apenas}
- Expected: 400 VALIDATION_ERROR

### CT-04 (UI) — Criar captação via formulário
- Pre: logado como analista_identificacao
- Passos: clicar "Nova Captação" → preencher rubrica/periodo/usuarioDeMusica → salvar
- Expected: toast/redirect de sucesso; captação aparece na listagem

### CT-05 (UI) — Validação client-side (RF-01.3)
- Passos: abrir formulário → submeter sem preencher
- Expected: mensagens de validação; requisição não enviada

## Estratégia de dados
- Cria captações com periodo 2026-06-19 (distinto dos existentes).
- Cleanup: ao final, exclui as captações criadas (DELETE) para não poluir o ambiente.
