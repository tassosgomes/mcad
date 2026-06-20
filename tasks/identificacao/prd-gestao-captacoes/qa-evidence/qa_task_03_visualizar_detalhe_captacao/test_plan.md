# Plano de Testes — qa_task_03 Visualizar Detalhe (RF-03)

**User Story:** RF-03 — Visualizar Detalhes de Captação
**Tipos:** API + UI
**Usuário:** analista_identificacao

## Fixture
- b070dbc0-0a27-4894-a5d6-4941e233d32e (RADIO, 2026-06-19, ABERTA, owner=eu) — criada na task_01

## Casos de Teste
- CT-01 (API): GET /captacoes/{id} válido → 200; todos campos; resumoExecucoes presente
- CT-02 (API): GET /captacoes/{id} inexistente → 404
- CT-03 (UI): clicar em captação → página de detalhe mostra dados; badge status; exigeClassificacao; resumo execuções (contadores)
