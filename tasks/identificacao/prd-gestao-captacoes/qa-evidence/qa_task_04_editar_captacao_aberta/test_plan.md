# Plano de Testes — qa_task_04 Editar Captação ABERTA (RF-04)

**User Story:** RF-04 — Editar Captação ABERTA (RN-08 propriedade, RN-01, rubrica bloqueada c/ execuções, status)
**Tipos:** API + UI (2 usuários)
**Usuários:** A=analista_identificacao (dono) | B=ilee (não-dono)

## Fixtures (criadas via API)
- F_EDIT (RADIO 2026-06-16) — para edição sucesso, RN-01, e teste ilee 403

## Casos de Teste
### Como dono (A)
- CT-01 (API): PUT own captacao ABERTA → 200 (dados atualizados)
- CT-02 (API): PUT mudando rubrica+periodo para combo existente ativo → 409 (RN-01)
- CT-03 (API): PUT em captação FECHADA → 422/bloqueado
- CT-04 (API): rubrica bloqueada quando tem execuções → 409 RUBRICA_BLOQUEADA (depende de ter execução)
- CT-05 (UI): editar via formulário → sucesso

### Como não-dono (B = ilee) — RN-08
- CT-06 (API): ilee PUT na captacao de A → 403 FORBIDDEN
- CT-07 (UI): ilee visualiza detalhe → botão editar indisponível
