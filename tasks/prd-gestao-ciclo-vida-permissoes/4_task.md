---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>engine/frontend/authz-shared</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"5.0, 6.0, 7.0, 8.0"</unblocks>
</task_context>

# Tarefa 4.0: Alinhar tipos, clientes e camada compartilhada do frontend ao contrato oficial do Authz

## Visao Geral

A camada compartilhada do frontend precisa refletir o contrato oficial do `ecad-authz`: status `DISABLED`, novas capacidades governadas do BFF e indisponibilidade atual dos fluxos de criar/reativar/remover. Esta task prepara a base para as paginas e evita regra duplicada em cada tela.

## Requisitos

- Atualizar `PermissionStatus` para `ACTIVE | DEPRECATED | DISABLED`.
- Exibir `DISABLED` como `Removida` na camada de apresentacao.
- Criar cliente/hook para capabilities do ciclo de vida.
- Criar cliente/hook para:
  - deprecacao governada no BFF;
  - papeis vinculados/elegibilidade.
- Preparar a camada para ativacao futura de create/reactivate/remove sem redesenho.

## Subtarefas

- [ ] 4.1 Atualizar tipos de permissao em `frontend/src/features/authz/types/permission.ts`
- [ ] 4.2 Ajustar `PermissionStatusBadge` para rotulo `Removida` quando status for `DISABLED`
- [ ] 4.3 Criar `authzPermissionLifecycleApi.ts` para rotas governadas do BFF
- [ ] 4.4 Criar hooks React Query para capabilities, deprecacao e linked roles
- [ ] 4.5 Centralizar capability matrix da feature em modulo compartilhado
- [ ] 4.6 Definir tratamento de erro para operacoes indisponiveis por dependencia externa
- [ ] 4.7 Cobrir a camada compartilhada com testes de tipos, badges, hooks e error mapping

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 5.0, 6.0, 7.0, 8.0
- Paralelizavel: Sim (pode rodar em paralelo com 2.0 e 3.0)

## Detalhes de Implementacao

- Arquivos provaveis:
  - `frontend/src/features/authz/api/authzPermissionLifecycleApi.ts`
  - `frontend/src/features/authz/hooks/usePermissionLifecycle.ts`
  - `frontend/src/features/authz/types/permission.ts`
  - `frontend/src/features/authz/components/PermissionStatusBadge.tsx`
- Reutilizar o padrao de:
  - `frontend/src/features/authz/hooks/usePermissionsCatalog.ts`
  - `frontend/src/features/authz/api/authzPermissionsApi.ts`

## Criterios de Sucesso

- A camada compartilhada conhece o status oficial `DISABLED`
- Existe uma capability matrix unica consumida pelas telas
- O frontend consegue consumir as rotas governadas novas do BFF
- A ativacao futura de create/reactivate/remove fica preparada sem retrabalho estrutural
