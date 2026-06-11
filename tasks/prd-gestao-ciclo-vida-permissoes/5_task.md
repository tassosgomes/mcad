---
status: pending
parallelizable: true
blocked_by: ["4.0"]
---

<task_context>
<domain>engine/frontend/authz-listing</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 5.0: Atualizar a listagem de permissoes para estados, filtros e CTAs condicionais

## Visao Geral

Evoluir `PermissionsPage` para refletir o contrato oficial atual e o roadmap da feature. A tela precisa tratar `DISABLED` como `Removida`, permitir filtro explicito desse estado e conduzir o usuario corretamente quando create/reactivate/remove ainda nao estiverem disponiveis no upstream.

## Requisitos

- Incluir filtro explicito para permissao `DISABLED`.
- Manter listagem padrao sem foco em permissoes removidas.
- Atualizar copy/labels para apresentar `DISABLED` como `Removida`.
- Exibir CTA de cadastro apenas de forma capability-aware.
- Evitar prometer fluxo de create quando o contrato ainda nao suportar a operacao.

## Subtarefas

- [ ] 5.1 Atualizar as opcoes de filtro de status em `PermissionsPage`
- [ ] 5.2 Ajustar tabelas, badges e textos auxiliares para `DISABLED -> Removida`
- [ ] 5.3 Incluir CTA de cadastro condicionado a capability
- [ ] 5.4 Definir comportamento visual para operacao indisponivel (ocultar, disabled com helper text, ou aviso contextual)
- [ ] 5.5 Revisar acessibilidade da listagem e do filtro de status
- [ ] 5.6 Criar/ajustar testes RTL da pagina

## Sequenciamento

- Bloqueado por: 4.0
- Desbloqueia: 8.0
- Paralelizavel: Sim (pode rodar em paralelo com 6.0)

## Detalhes de Implementacao

- Arquivos provaveis:
  - `frontend/src/features/authz/pages/PermissionsPage.tsx`
  - `frontend/src/features/authz/pages/PermissionsPage.module.css`
  - testes da pagina/listagem
- Esta task nao implementa cadastro real; apenas o comportamento coerente com a capability matrix.

## Criterios de Sucesso

- A listagem trata `DISABLED` corretamente
- O filtro explicito de removidas existe e funciona
- O usuario nao recebe CTA enganoso para uma operacao ainda indisponivel
- Os testes cobrem filtro, badge e CTA capability-aware
