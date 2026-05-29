---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>plataforma/identity-sync-api</domain>
<type>implementation</type>
<scope>integration</scope>
<complexity>medium</complexity>
<dependencies>logto,rabbitmq,http_server</dependencies>
<unblocks>3.0</unblocks>
</task_context>

# Tarefa 2.0: Publicar sync de identidade sem roles no `identity-sync-api`

## Relacionada as User Stories

- Administrador de Plataforma mantem sincronizacao de usuarios sem duplicar autorizacao.
- Auditor tem trilha clara de roles ignoradas sem vazamento de dados sensiveis.

## Visao Geral

Atualizar o `identity-sync-api` para transportar somente identidade e status do usuario. O servico deve parar de buscar roles na Management API do Logto e publicar eventos `identity.user.*` sem roles de negocio.

## Requisitos

- Remover chamadas a `GET /users/{id}/roles` do cliente Logto.
- Ajustar `LogtoUser` e `IdentityUserSnapshot` para nao dependerem de `roles`.
- Publicar payload com `roles` ausente ou `roles: []`, conforme compatibilidade existente.
- Registrar metrica/log quando roles antigas forem recebidas em mocks/eventos legados, sem expor dados sensiveis.
- Atualizar README e testes do servico.

## Arquivos Envolvidos

- **Modificar:**
  - `services/identity-sync-api/src/logto.ts`
  - `services/identity-sync-api/src/events.ts`
  - `services/identity-sync-api/src/sync.ts`
  - `services/identity-sync-api/src/server.test.ts`
  - `services/identity-sync-api/README.md`
- **Referencia:**
  - `services/identity-sync-api/src/publisher.ts`
  - `services/identity-sync-api/src/config.ts`
  - `tasks/plataforma/prd-authz-fonte-unica-assignments/techspec.md`

## Subtarefas

- [ ] 2.1 Remover do cliente Logto qualquer chamada para listar roles por usuario.
- [ ] 2.2 Ajustar tipos de usuario/snapshot para conter `logtoUserId`, `username`, `displayName`, `email`, `avatarUrl`, `isSuspended` e `raw`.
- [ ] 2.3 Normalizar `buildIdentityEvent()` para omitir `roles` ou publicar array vazio.
- [ ] 2.4 Garantir que sync manual `POST /sync/logto/users` continue funcionando.
- [ ] 2.5 Adicionar/ajustar metric `identity_sync_roles_ignored_total` se houver entrada legada com roles.
- [ ] 2.6 Atualizar testes para provar que `/users/{id}/roles` nao e chamado.
- [ ] 2.7 Atualizar testes para provar que evento publicado nao contem roles de negocio.
- [ ] 2.8 Atualizar README com contrato alvo e nota de que assignments pertencem ao `ecad-authz`.

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 3.0
- Paralelizavel: Nao no fluxo critico. A implementacao pode ser preparada cedo, mas deploy deve vir depois do `ecad-authz` ignorar roles.

## Rastreabilidade

- Cobre RF-01 integralmente.
- Evidencia esperada: polling e sync manual continuam publicando usuarios, sem roles.

## Detalhes de Implementacao

Interface alvo:

```ts
export interface IdentityUserSnapshot {
  logtoUserId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  isSuspended: boolean;
  raw: Record<string, unknown>;
}
```

O evento RabbitMQ deve manter routing key `identity.user.*`. Consumidores antigos que toleram `roles: []` devem continuar funcionando.

## Criterios de Sucesso Verificaveis

- [ ] `cd services/identity-sync-api && npm test` passa.
- [ ] Build TypeScript do `identity-sync-api` passa.
- [ ] Teste comprova que o mock Logto nao recebe chamada `/users/{id}/roles`.
- [ ] Evento publicado para usuario ativo/suspenso nao contem roles de negocio.
- [ ] Sync manual retorna sucesso sem depender de claims ou roles.
- [ ] README descreve que assignments devem ser criados via `ecad-authz`.
