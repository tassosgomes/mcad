---
status: pending
parallelizable: false
blocked_by: []
---

<task_context>
<domain>plataforma/ecad-authz/identity-sync</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database,rabbitmq,java_service</dependencies>
<unblocks>2.0, 3.0, 5.0</unblocks>
</task_context>

# Tarefa 1.0: Remover autoassignment por roles do IdP no `ecad-authz`

## Relacionada as User Stories

- Administrador de Plataforma remove o IdP como origem de papeis de negocio.
- Desenvolvedor de Servico passa a depender apenas de permissao efetiva/PDP.
- Usuario MCAD nao recebe papel automatico por claims ou eventos antigos.

## Visao Geral

Remover permanentemente do `ecad-authz` o fluxo que transforma `roleKeys` vindas do IdP em assignments reais. O sync de identidade deve continuar fazendo upsert de usuario e status, mas qualquer role recebida de mensagem antiga deve ser ignorada, observada e nunca persistida como `user_roles`.

## Requisitos

- Remover `SyncIdentityUserUseCase.assignMappedRoles(...)` ou equivalente.
- Manter compatibilidade de entrada com eventos antigos que ainda contenham `roleKeys`.
- Retornar/registrar `assignedRoles=0` e `ignoredRoleKeys` quando aplicavel.
- Garantir que apenas endpoints oficiais de assignment criem/removam roles de usuario.
- Nao introduzir feature flag para reativar o comportamento legado.
- Nao logar tokens, documentos ou dados pessoais desnecessarios.

## Arquivos Envolvidos

- **Modificar:**
  - `/home/tsgomes/github-tassosgomes/ecad-authz/**/SyncIdentityUserUseCase*`
  - `/home/tsgomes/github-tassosgomes/ecad-authz/**/SyncIdentityUserResult*`
  - Testes unitarios/integracao relacionados ao sync de identidade
- **Referencia:**
  - `tasks/plataforma/prd-authz-fonte-unica-assignments/prd.md`
  - `tasks/plataforma/prd-authz-fonte-unica-assignments/techspec.md`
  - `seeds/mcad/roles.json`
  - `scripts/seed-authz.sh`

## Subtarefas

- [ ] 1.1 Localizar o fluxo atual que mapeia `roleKeys` para catalogo oficial e chama persistencia de assignment.
- [ ] 1.2 Remover a chamada de autoassignment mantendo o upsert de usuario, status e `authzVersion`.
- [ ] 1.3 Ajustar DTO/resultado para expor `assignedRoles=0` e `ignoredRoleKeys` quando mensagens antigas trouxerem roles.
- [ ] 1.4 Adicionar log estruturado/metric `authz_identity_role_keys_ignored_total` sem valores sensiveis.
- [ ] 1.5 Revisar todos os testes que esperavam assignments automaticos e reescreve-los para deny seguro.
- [ ] 1.6 Criar teste com evento contendo `roleKeys` garantindo que nenhuma linha em `user_roles` seja criada.
- [ ] 1.7 Criar teste com usuario novo garantindo upsert sem papel automatico.
- [ ] 1.8 Documentar no README/docs do `ecad-authz` que assignments entram apenas por APIs oficiais.

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 5.0
- Paralelizavel: Nao. Esta tarefa define a garantia autoritativa que impede regressao da origem IdP.

## Rastreabilidade

- Cobre RF-01 e parte de RF-07.
- Evidencia esperada: evento antigo com roles e usuario novo sincronizado nao criam assignments.

## Detalhes de Implementacao

O comando pode continuar aceitando `roleKeys` para compatibilidade de contrato, mas o campo deve virar diagnostico ignorado. Se houver metodo de mapeamento de roles para ids de papel, ele deve sair do caminho de execucao do sync.

Resultado esperado:

```java
public record SyncIdentityUserResult(
    String userId,
    long authzVersion,
    int assignedRoles,
    int ignoredRoleKeys
) {}
```

## Criterios de Sucesso Verificaveis

- [ ] Build do `ecad-authz` compila sem erros.
- [ ] Testes de sync de identidade passam.
- [ ] Teste comprova que `roleKeys=["admin"]` gera `ignoredRoleKeys=1` e `assignedRoles=0`.
- [ ] Teste comprova que nenhum `saveAssignment`/insert em `user_roles` ocorre durante sync.
- [ ] Busca estatica no `ecad-authz` nao encontra chamada ativa de autoassignment no fluxo de sync.
- [ ] Logs/metricas registram contagem de roles ignoradas sem expor PII desnecessaria.
