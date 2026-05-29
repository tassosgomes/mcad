# Investigação — Propagação de JWT Distribuição → Cadastro

## Estado Atual

O fluxo normal autenticado da `distribuicao-api` propaga o JWT do usuário final para a `cadastro-api` ao consultar o ownership snapshot. O cenário identificado é **A — JWT do usuário propagado**, desde que `CADASTRO_TOKEN_STRATEGY` permaneça no default `ANALYST_OR_SERVICE` ou seja configurado como `ANALYST_ONLY`.

Há fallbacks configuráveis:

- **B — Service token:** ocorre quando não há bearer do usuário e `CADASTRO_SERVICE_TOKEN` está configurado, ou quando `CADASTRO_TOKEN_STRATEGY=SERVICE_ONLY`.
- **C — Sem credencial:** ocorre quando não há bearer do usuário nem `CADASTRO_SERVICE_TOKEN`.

Para o mascaramento server-side de CPF da Tarefa 2.0, não é necessária mudança de produção na Distribuição se os ambientes não usarem `SERVICE_ONLY` nesse fluxo.

## Evidências

- `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/ProcessoCalculoController.java:36` expõe `POST /api/v1/processos/{id}/calcular`.
- `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/ProcessoCalculoController.java:41` lê `Authorization` via `@RequestHeader`.
- `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/ProcessoCalculoController.java:42` repassa o header para `CalcularProcessoCommand`.
- `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/commands/handlers/CalcularProcessoCommandHandler.java:125` repassa `command.bearerToken()` para `CadastroOwnershipClient`.
- `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/services/CreditoRetidoLiberacaoService.java:80` preserva o mesmo token na segunda consulta de ownership.
- `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/cadastro/HttpCadastroOwnershipClient.java:118` monta a requisição HTTP ao Cadastro.
- `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/cadastro/HttpCadastroOwnershipClient.java:126` adiciona `Authorization` quando `resolveAuthorizationHeader(...)` retorna token.
- `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/cadastro/HttpCadastroOwnershipClient.java:244` prioriza o bearer do usuário, exceto em `SERVICE_ONLY`.
- `services/distribuicao-api/distribuicao-api/src/main/resources/application.yml:80` define `token-strategy: ${CADASTRO_TOKEN_STRATEGY:ANALYST_OR_SERVICE}` e `service-token: ${CADASTRO_SERVICE_TOKEN:}`.
- `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/cadastro/CadastroOwnershipProperties.java:11` confirma o default `ANALYST_OR_SERVICE`.

Cobertura automatizada já existente:

- `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/HttpCadastroOwnershipClientTest.java:87` valida que `Bearer analyst-token` é encaminhado.
- `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/HttpCadastroOwnershipClientTest.java:100` valida fallback para `Bearer service-token`.

Lacuna observada: o teste integrado do controller usa `.with(jwt())`, mas não envia o header `Authorization`; portanto ele não prova controller → handler com header real. Essa lacuna não bloqueia a Tarefa 2.0, mas merece teste de regressão.

## Recomendação

Manter `CADASTRO_TOKEN_STRATEGY=ANALYST_OR_SERVICE` nos ambientes onde a Distribuição consulta Cadastro, ou usar `ANALYST_ONLY` caso a política queira falhar fechado quando o JWT do usuário não estiver presente.

Evitar `CADASTRO_TOKEN_STRATEGY=SERVICE_ONLY` para esse fluxo, porque o Cadastro passaria a avaliar permissões do cliente técnico, não do usuário final, quebrando a semântica do mascaramento por perfil.

## Próximos Passos Para Tarefa 2.0

- Implementar o permission-aware mapper no Cadastro consumindo a claim `permission` do JWT recebido.
- Adicionar teste integrado em Distribuição para garantir que o header `Authorization: Bearer <jwt-do-usuario>` lido no controller chega ao `CadastroOwnershipClient`.
- Incluir no checklist operacional que `SERVICE_ONLY` não deve ser usado para o fluxo de cálculo que precisa preservar permissões do usuário.
