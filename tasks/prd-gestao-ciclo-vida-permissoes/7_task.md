---
status: pending
parallelizable: false
blocked_by: ["1.0", "4.0", "6.0"]
---

<task_context>
<domain>engine/integration/authz-upstream</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>external_apis,http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Ativar os fluxos de criar, reativar e remover apos disponibilizacao dos endpoints no `ecad-authz`

## Visao Geral

Esta task fecha o PRD completo quando o upstream disponibilizar os novos endpoints administrativos. Ela reaproveita a capability matrix e a estrutura preparada nas tasks anteriores para ativar, de fato, os fluxos de cadastro, reativacao e remocao logica de permissao.

## Requisitos

- Consumir endpoints reais de create/reactivate/remove do `ecad-authz` quando disponiveis.
- Remover o estado de indisponibilidade da UI para as operacoes suportadas.
- Validar server-side e UX do campo `CONFIRMO` para remocao.
- Respeitar o status tecnico final `DISABLED`.
- Fechar o fluxo:
  - `ACTIVE -> DEPRECATED -> DISABLED`
  - `DEPRECATED -> ACTIVE`

## Subtarefas

- [ ] 7.1 Confirmar a OpenAPI atualizada do `ecad-authz` com endpoints e erros finais
- [ ] 7.2 Atualizar o cliente API do frontend e, se necessario, o BFF para create/reactivate/remove
- [ ] 7.3 Implementar formulario de cadastro de permissao
- [ ] 7.4 Implementar acao de reativacao no detalhe da permissao
- [ ] 7.5 Implementar acao de remocao com confirmacao `CONFIRMO`
- [ ] 7.6 Validar tratamento de erros como `INVALID_CONFIRMATION`, `PERMISSION_IN_USE` e transicao invalida
- [ ] 7.7 Atualizar testes automatizados para os fluxos completos

## Sequenciamento

- Bloqueado por: 1.0, 4.0, 6.0
- Desbloqueia: 8.0
- Paralelizavel: Nao (depende de contrato externo e da base pronta nas tasks anteriores)

## Detalhes de Implementacao

- Dependencia externa adicional: disponibilidade real dos endpoints no `ecad-authz`
- O codigo preparado na Fase 1 deve ser reaproveitado, sem redesenho de arquitetura
- Esta task so deve ser iniciada quando a OpenAPI do upstream estiver publicada e validada

## Criterios de Sucesso

- O MCAD consegue criar, reativar e remover permissoes pela UI oficial
- A remocao exige `CONFIRMO` e respeita os bloqueios por vinculacao
- O fluxo completo do PRD fica operacional sem bypass manual
- Os testes cobrem create, reactivate e remove contra o contrato final
