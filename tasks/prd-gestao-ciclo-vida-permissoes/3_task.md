---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>engine/bff/authz</domain>
<type>implementation</type>
<scope>middleware</scope>
<complexity>medium</complexity>
<dependencies>external_apis,http_server</dependencies>
<unblocks>"6.0, 8.0"</unblocks>
</task_context>

# Tarefa 3.0: Implementar no BFF a deprecacao auditada de permissao

## Visao Geral

Criar um wrapper governado no BFF para a deprecacao de permissao. A mutacao ja existe no `ecad-authz` (`PATCH /v1/permissions/{id}/deprecate`), mas o MCAD precisa encapsular autorizacao, correlação, propagacao de `x-authz-version` e trilha auditavel no servico de Auditoria.

## Requisitos

- Criar `POST /api/autorizacao/permissoes/:id/depreciar`.
- Chamar internamente `PATCH /v1/permissions/{id}/deprecate`.
- Publicar evento de auditoria para sucesso e falha relevante.
- Propagar `x-authz-version` quando houver.
- Mapear mensagens de erro para o frontend sem perder `code` e `message`.

## Subtarefas

- [ ] 3.1 Definir contrato HTTP local do endpoint de deprecacao no BFF
- [ ] 3.2 Implementar proxy controlado da chamada `PATCH /v1/permissions/{id}/deprecate`
- [ ] 3.3 Propagar `x-correlation-id` e `x-authz-version`
- [ ] 3.4 Integrar publicacao de auditoria no padrao ja usado em `services/bff/src/auditoria`
- [ ] 3.5 Normalizar erros de autorizacao, recurso inexistente e falha do upstream
- [ ] 3.6 Adicionar testes cobrindo 200, 401, 403, 404 e indisponibilidade do `ecad-authz`

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 6.0, 8.0
- Paralelizavel: Sim (pode rodar em paralelo com 2.0 e 4.0)

## Detalhes de Implementacao

- Arquivos provaveis:
  - `services/bff/src/authzPermissionLifecycleRoutes.ts`
  - `services/bff/src/authzPermissionLifecycleRoutes.test.ts`
  - `services/bff/src/server.ts`
- Reutilizar:
  - `services/bff/src/auditoria/auditEventPublisher.ts`
  - `services/bff/src/authzContext.ts`
- O endpoint local usa `POST` por coerencia com o padrao de acao governada do MCAD, mesmo que o upstream use `PATCH`.

## Criterios de Sucesso

- O frontend nao precisa mais chamar diretamente o proxy generico para depreciar permissoes
- A deprecacao gera trilha auditavel no BFF
- O header `x-authz-version` chega intacto ao cliente
- Os testes demonstram comportamento correto em sucesso e falha
