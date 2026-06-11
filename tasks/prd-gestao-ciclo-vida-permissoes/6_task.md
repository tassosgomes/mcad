---
status: pending
parallelizable: false
blocked_by: ["2.0", "3.0", "4.0"]
---

<task_context>
<domain>engine/frontend/authz-detail</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server,external_apis</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 6.0: Atualizar o detalhe de permissao com vinculos, elegibilidade e fluxo governado de deprecacao

## Visao Geral

Refatorar `PermissionDetailPage` para que a tela deixe de ser apenas um detalhe tecnico do catalogo e passe a ser o centro de decisao administrativa segura. O detalhe precisa exibir status, papeis vinculados, elegibilidade de remocao, prerequisito de deprecacao e a acao governada de deprecar via BFF.

## Requisitos

- Consumir `GET /api/autorizacao/permissoes/:id/papeis-vinculados`.
- Consumir `POST /api/autorizacao/permissoes/:id/depreciar`.
- Exibir lista de papeis vinculados com `key`, `displayName` e `status`.
- Exibir mensagens claras para:
  - sem vinculos;
  - com vinculos;
  - status ainda nao elegivel;
  - create/reactivate/remove indisponiveis por dependencia externa.
- Preservar o padrao de acessibilidade da tela atual.

## Subtarefas

- [ ] 6.1 Integrar a tela ao hook de linked roles/elegibilidade
- [ ] 6.2 Integrar a acao de deprecacao ao endpoint governado do BFF
- [ ] 6.3 Exibir bloco de papeis vinculados no detalhe da permissao
- [ ] 6.4 Exibir estado de elegibilidade de remocao com mensagens de bloqueio
- [ ] 6.5 Mostrar create/reactivate/remove como indisponiveis ou condicionados a capability
- [ ] 6.6 Revisar copy da acao destrutiva futura para exigir `CONFIRMO` quando o upstream estiver disponivel
- [ ] 6.7 Atualizar testes RTL da tela cobrindo estados com e sem vinculos

## Sequenciamento

- Bloqueado por: 2.0, 3.0, 4.0
- Desbloqueia: 8.0
- Paralelizavel: Nao (converge dependencias de BFF e camada compartilhada)

## Detalhes de Implementacao

- Arquivos provaveis:
  - `frontend/src/features/authz/pages/PermissionDetailPage.tsx`
  - `frontend/src/features/authz/pages/PermissionDetailPage.module.css`
  - testes da tela
- Reutilizar:
  - `ConfirmModal`
  - `PageHeader`
  - `useToast`
- O design deve deixar claro que deprecacao e o unico passo operacional disponivel hoje no contrato atual.

## Criterios de Sucesso

- O detalhe mostra papeis vinculados e elegibilidade de remocao
- A deprecacao usa o fluxo governado do BFF
- Os estados indisponiveis estao explicados sem confundir o usuario
- Testes cobrem as principais combinacoes de status e vinculacao
