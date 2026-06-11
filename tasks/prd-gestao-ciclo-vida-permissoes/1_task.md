---
status: pending
parallelizable: false
blocked_by: []
---

<task_context>
<domain>engine/integration/authz-contract</domain>
<type>integration</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>external_apis,http_server</dependencies>
<unblocks>"2.0, 3.0, 4.0, 7.0"</unblocks>
</task_context>

# Tarefa 1.0: Formalizar contrato externo do Authz e matriz de capabilities do MCAD

## Visao Geral

Consolidar, no repositorio do MCAD, a leitura contratual oficial do `ecad-authz` para esta feature. Esta tarefa fecha os pontos que hoje ja estao conhecidos: `PermissionStatus` oficial usa `DISABLED`, apenas deprecacao e lookup de vinculacao podem ser implementados imediatamente, e create/reactivate/remove dependem de novos endpoints no upstream. O resultado esperado e uma capability matrix clara para o frontend e o BFF trabalharem em modo fail-closed.

## Requisitos

- Reaproveitar a documentacao existente em `authz-api-solicitacao.md`.
- Tornar explicito que `DISABLED` deve ser apresentado como `Removida` na UX.
- Formalizar uma capability matrix local para a feature:
  - `canDeprecate: true`
  - `canListLinkedRoles: true`
  - `canCreate: false`
  - `canReactivate: false`
  - `canRemove: false`
- Definir o codigo/shape local usado quando uma operacao depender de endpoint ainda ausente no upstream.

## Subtarefas

- [ ] 1.1 Revisar `prd.md`, `techspec.md` e `authz-api-solicitacao.md` para consolidar a leitura oficial do contrato
- [ ] 1.2 Definir um artefato compartilhado para capabilities da feature (ex.: constante em `frontend` e modulo utilitario no `bff`)
- [ ] 1.3 Definir e documentar o tratamento local do estado `DISABLED` como rotulo de negocio `Removida`
- [ ] 1.4 Definir o erro local para operacao indisponivel por dependencia externa do `ecad-authz`
- [ ] 1.5 Atualizar a documentacao da feature apontando o que e Fase 1 e o que e Fase 2
- [ ] 1.6 Revisar consistencia do plano antes de iniciar implementacao nas demais tasks

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 4.0, 7.0
- Paralelizavel: Nao (fecha a base contratual para as demais trilhas)

## Detalhes de Implementacao

- Referencias principais:
  - `tasks/prd-gestao-ciclo-vida-permissoes/prd.md`
  - `tasks/prd-gestao-ciclo-vida-permissoes/techspec.md`
  - `tasks/prd-gestao-ciclo-vida-permissoes/authz-api-solicitacao.md`
- O resultado nao precisa introduzir feature flag remota; basta uma capability matrix local e explicita.
- A definicao de erro deve ser reutilizavel no frontend e no BFF para evitar mensagens divergentes.

## Criterios de Sucesso

- Existe uma capability matrix documentada e reutilizavel no codigo
- O status `DISABLED` esta oficialmente mapeado para o rotulo de UX `Removida`
- O time tem uma definicao unica do que e possivel hoje e do que depende do upstream
- As tasks 2.0, 3.0, 4.0 e 7.0 conseguem partir sem ambiguidade contratual
