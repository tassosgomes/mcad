# Solicitação de Evolução da API `ecad-authz`

> **Status: ATENDIDA (2026-06-13).**
> Todos os endpoints solicitados foram publicados pelo time do `ecad-authz`. O MCAD absorveu o contrato final e concluiu a implementação completa do ciclo de vida de permissões (Tasks 1.0 a 7.0). Detalhes do contrato final em `authz-contract.md`.
>
> O documento abaixo é mantido como registro histórico da solicitação original.

---


## Contexto

O PRD `gestao-ciclo-vida-permissoes` do MCAD precisa fechar o ciclo administrativo de permissões no módulo de Autorização. Hoje a OpenAPI do `ecad-authz` já cobre:

- consulta de catálogo de permissões;
- consulta de detalhe de permissão;
- depreciação de permissão via `PATCH /permissions/{permissionId}/deprecate`;
- consulta de papéis e composição `role -> permissions`.

Isso permite implementar listagem, detalhe e depreciação, mas ainda não permite entregar o fluxo completo previsto no PRD.

## Gaps Confirmados na OpenAPI Atual

Atualmente não existem endpoints administrativos para:

1. criar uma permissão isolada manualmente pela UI administrativa;
2. reativar uma permissão previamente depreciada;
3. remover logicamente uma permissão em estado final;
4. consultar diretamente quais papéis estão vinculados a uma permissão.

Além disso, o contrato atual usa `PermissionStatus = ACTIVE | DEPRECATED | DISABLED`, enquanto o PRD do MCAD trabalha o estado final de negócio como `REMOVED`. Não é bloqueante manter `DISABLED`, mas precisamos alinhar a semântica oficialmente.

## Solicitação

Precisamos evoluir a API do `ecad-authz` com suporte administrativo explícito ao ciclo de vida de permissões.

### 1. Criar permissão manualmente

Criar endpoint administrativo para cadastro unitário de permissão.

Sugestão:

- `POST /v1/permissions`

Payload sugerido:

```json
{
  "key": "cadastro:default:obra:aprovar",
  "displayName": "Aprovar obra",
  "description": "Permite aprovar obras no domínio Cadastro.",
  "domain": "cadastro",
  "area": "default",
  "resource": "obra",
  "action": "aprovar"
}
```

Comportamento esperado:

- validar formato `dominio:area:recurso:acao`;
- validar unicidade da `key`;
- criar com status inicial `ACTIVE`;
- retornar `201 Created`;
- emitir `X-Authz-Version`;
- auditar a operação.

### 2. Reativar permissão depreciada

Criar endpoint administrativo para reativação de permissão.

Sugestão:

- `POST /v1/permissions/{permissionId}/reactivate`

Comportamento esperado:

- permitir apenas quando status atual for `DEPRECATED`;
- alterar o status para `ACTIVE`;
- preservar `id`, `key` e histórico da permissão;
- retornar `200 OK` com a permissão atualizada;
- retornar erro semântico se a permissão já estiver `ACTIVE` ou em estado final;
- emitir `X-Authz-Version`;
- auditar a operação.

### 3. Remover logicamente uma permissão

Criar endpoint administrativo para remoção lógica final de permissão.

Sugestão:

- `POST /v1/permissions/{permissionId}/remove`

Se desejarem reforçar governança no próprio serviço, pode aceitar corpo:

```json
{
  "confirmationText": "CONFIRMO"
}
```

Comportamento esperado:

- permitir apenas quando status atual for `DEPRECATED`;
- bloquear remoção se a permissão ainda estiver vinculada a qualquer papel;
- transicionar para estado final lógico (`DISABLED` ou `REMOVED`, conforme decisão do time);
- não permitir reativação normal após a remoção final;
- retornar erro semântico claro para:
  - status inválido;
  - vínculos ainda existentes;
  - confirmação inválida, se o serviço optar por validar isso;
- emitir `X-Authz-Version`;
- auditar sucesso e tentativas negadas.

### 4. Expor vínculos de papéis por permissão

Criar endpoint de leitura para suportar o detalhe da permissão na UI.

Sugestão:

- `GET /v1/permissions/{permissionId}/roles`

Resposta mínima sugerida:

```json
[
  {
    "id": "role-123",
    "key": "cadastro.default.analista",
    "displayName": "Analista de Cadastro",
    "status": "ACTIVE"
  }
]
```

Comportamento esperado:

- retornar todos os papéis atualmente vinculados à permissão;
- permitir paginação se o volume justificar;
- servir como base oficial para a regra de bloqueio de remoção;
- evitar que o cliente precise fazer fan-out em `GET /roles` + `GET /roles/{id}/permissions`.

## Alinhamento de Status

Precisamos de uma definição explícita sobre o estado final de remoção lógica:

- opção A: manter `DISABLED` como estado técnico final e documentar que ele representa “removida” no fluxo administrativo;
- opção B: substituir/adicionar `REMOVED` no contrato de `PermissionStatus`.

Para o MCAD, qualquer uma das duas opções funciona, desde que a semântica fique estável e documentada. Hoje, para reduzir impacto, a opção mais simples parece ser manter `DISABLED` e formalizar que ele representa a remoção lógica final da permissão.

## Regras de Negócio Esperadas

As evoluções acima precisam respeitar estas regras:

1. apenas administradores globais do Authz podem executar essas operações;
2. criação sempre inicia em `ACTIVE`;
3. remoção final exige fluxo `ACTIVE -> DEPRECATED -> estado final`;
4. remoção final não pode ocorrer com vínculos ativos em papéis;
5. reativação só pode ocorrer a partir de `DEPRECATED`;
6. todas as operações devem gerar trilha auditável.

## Impacto para o MCAD

Com essas evoluções, o MCAD consegue entregar o fluxo completo do PRD:

- cadastrar nova permissão pela UI;
- depreciar permissão existente;
- reativar permissão depreciada;
- remover logicamente permissão sem vínculos;
- mostrar no detalhe da permissão quais papéis impedem a remoção.

Sem essas evoluções, a entrega no MCAD fica limitada a:

- listagem;
- detalhe;
- depreciação;
- consulta derivada de vínculos por workaround no cliente/BFF.

## Pedido Objetivo

Solicitamos ao time do `ecad-authz`:

1. adicionar endpoints administrativos para `create`, `reactivate` e `remove` de permissões;
2. adicionar endpoint oficial para listar papéis vinculados a uma permissão;
3. alinhar e documentar o estado final lógico da permissão (`DISABLED` vs `REMOVED`);
4. publicar a OpenAPI atualizada como fonte de verdade para integração do MCAD.
