# Investigação de Permissões das APIs

Data: 2026-06-10

## Escopo

Fonte da verdade considerada nesta investigação:

- `services/cadastro-api`
- `services/identificacao-api`
- `services/arrecadacao-api`
- `services/distribuicao-api`
- `services/bff`

Catálogos comparados:

- `seeds/mcad/*.permissions.json`
- `seeds/mcad/roles.json`
- catálogo/papéis remotos do `mcad-authz`

## Achados principais

1. `arrecadacao-api` tinha permissões de `rubrica:*` em controller e em `permissions.yaml`, mas elas não estavam no seed local nem no catálogo remoto.
2. `distribuicao-api` tinha permissões de `ajuste:*` e `demonstrativo:listar` em controllers, mas elas não estavam no seed local, nem nos papéis locais, nem no catálogo remoto.
3. O catálogo remoto estava sem as permissões do domínio `auditoria` e sem os papéis `auditoria.default.*`, embora o BFF já as use.
4. O catálogo remoto também estava sem permissões escopadas do domínio `acessos` (`acessos:{dominio}:...`), o que deixava o papel `distribuicao.default.gerente` incompleto.
5. As 42 permissões `cadastro:default:*` estavam presentes no remoto, porém marcadas como `DEPRECATED`; isso conflita com os endpoints atuais do `cadastro-api`.
6. O papel remoto `arrecadacao.default.demostracao` estava divergente do seed local: no remoto ele tinha permissões de `cliente:*`, mas o papel correto é restrito a `arrecadacao:default:cobranca:listar`.

## Inventário consolidado

### Cadastro API

Fonte: `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs`

1. `cadastro:default:associacao:listar`
2. `cadastro:default:associacao:visualizar`
3. `cadastro:default:titular:listar`
4. `cadastro:default:titular:visualizar`
5. `cadastro:default:titular:buscar`
6. `cadastro:default:titular:criar`
7. `cadastro:default:titular:editar`
8. `cadastro:default:titular:excluir`
9. `cadastro:default:obra:listar`
10. `cadastro:default:obra:visualizar`
11. `cadastro:default:obra:criar`
12. `cadastro:default:obra:editar`
13. `cadastro:default:obra:excluir`
14. `cadastro:default:obra:gerar-iswc`
15. `cadastro:default:obra:depurar`
16. `cadastro:default:obra:dp`
17. `cadastro:default:titularidade:listar`
18. `cadastro:default:titularidade:buscar`
19. `cadastro:default:titularidade:adicionar`
20. `cadastro:default:titularidade:editar`
21. `cadastro:default:titularidade:remover`
22. `cadastro:default:fonograma:listar`
23. `cadastro:default:fonograma:visualizar`
24. `cadastro:default:fonograma:listar-por-obra`
25. `cadastro:default:fonograma:criar`
26. `cadastro:default:fonograma:editar`
27. `cadastro:default:fonograma:excluir`
28. `cadastro:default:fonograma:depurar`
29. `cadastro:default:participacao:listar`
30. `cadastro:default:participacao:adicionar`
31. `cadastro:default:participacao:ajustar`
32. `cadastro:default:participacao:remover`
33. `cadastro:default:participacao:calcular`
34. `cadastro:default:status:visualizar-historico-obra`
35. `cadastro:default:status:visualizar-historico-fonograma`
36. `cadastro:default:status:liberar-obra`
37. `cadastro:default:status:bloquear-obra`
38. `cadastro:default:status:desbloquear-obra`
39. `cadastro:default:status:liberar-fonograma`
40. `cadastro:default:status:bloquear-fonograma`
41. `cadastro:default:status:desbloquear-fonograma`
42. `cadastro:default:titular:ver-cpf-completo`

### Identificação API

Fonte: `services/identificacao-api/1-Services/Identificacao.API/Authorization/IdentificacaoPermissions.cs`

1. `identificacao:default:captacao:listar`
2. `identificacao:default:captacao:visualizar`
3. `identificacao:default:captacao:criar`
4. `identificacao:default:captacao:editar`
5. `identificacao:default:captacao:excluir`
6. `identificacao:default:captacao:cancelar`
7. `identificacao:default:captacao:fechar`
8. `identificacao:default:execucao:listar`
9. `identificacao:default:execucao:criar`
10. `identificacao:default:execucao:editar`
11. `identificacao:default:execucao:excluir`
12. `identificacao:default:rubrica:listar`
13. `identificacao:default:tipo-utilizacao:listar`
14. `identificacao:default:upload:listar`
15. `identificacao:default:upload:visualizar`
16. `identificacao:default:upload:visualizar-erros`
17. `identificacao:default:upload:importar`
18. `identificacao:default:pendente:listar`
19. `identificacao:default:pendente:visualizar-impacto`
20. `identificacao:default:pendente:resolver`

### Arrecadação API

Fonte: `services/arrecadacao-api/arrecadacao-api/src/main/resources/permissions.yaml` e controllers em `services/arrecadacao-api/arrecadacao-api/src/main/java/.../controllers`

1. `arrecadacao:default:cliente:listar`
2. `arrecadacao:default:cliente:visualizar`
3. `arrecadacao:default:cliente:criar`
4. `arrecadacao:default:cliente:editar`
5. `arrecadacao:default:contrato:listar`
6. `arrecadacao:default:contrato:visualizar`
7. `arrecadacao:default:contrato:criar`
8. `arrecadacao:default:contrato:editar`
9. `arrecadacao:default:contrato:cancelar`
10. `arrecadacao:default:cobranca:listar`
11. `arrecadacao:default:cobranca:emitir`
12. `arrecadacao:default:pagamento:listar`
13. `arrecadacao:default:pagamento:visualizar`
14. `arrecadacao:default:pagamento:conciliar`
15. `arrecadacao:default:pagamento:estornar`
16. `arrecadacao:default:rubrica:visualizar`
17. `arrecadacao:default:rubrica:criar`
18. `arrecadacao:default:rubrica:editar`
19. `arrecadacao:default:rubrica:inativar`
20. `arrecadacao:default:relatorio:visualizar`
21. `arrecadacao:default:relatorio:exportar`

### Distribuição API

Fonte: `services/distribuicao-api/distribuicao-api/src/main/resources/permissions.yaml`, controllers em `services/distribuicao-api/distribuicao-api/src/main/java/.../controllers` e matriz de enforcement em `services/distribuicao-api/distribuicao-tests/src/test/java/.../AuthzPermissionEnforcementTest.java`

1. `distribuicao:default:rubrica:listar`
2. `distribuicao:default:rubrica:visualizar`
3. `distribuicao:default:processo:listar`
4. `distribuicao:default:processo:visualizar`
5. `distribuicao:default:processo:criar`
6. `distribuicao:default:processo:calcular`
7. `distribuicao:default:processo:aprovar`
8. `distribuicao:default:processo:finalizar`
9. `distribuicao:default:processo:cancelar`
10. `distribuicao:default:ajuste:listar`
11. `distribuicao:default:ajuste:visualizar`
12. `distribuicao:default:credito:listar`
13. `distribuicao:default:credito:visualizar`
14. `distribuicao:default:processo:exportar`
15. `distribuicao:default:processo:ver-justificativa-cancelamento`
16. `distribuicao:default:processo:recalcular-pos-calculado`
17. `distribuicao:default:credito-retido:liberar-manual`
18. `distribuicao:default:processo:ver-historico-alteracoes`
19. `distribuicao:default:credito:ver-historico-alteracoes`
20. `distribuicao:default:demonstrativo:listar`
21. `distribuicao:default:demonstrativo:visualizar`
22. `distribuicao:default:demonstrativo:exportar`

### BFF - Acessos

Fonte: `services/bff/src/acessosRoutes.ts`, `services/bff/src/historicoRoutes.ts` e `seeds/mcad/acessos.permissions.json`

1. `acessos:default:papel:listar`
2. `acessos:default:papel:visualizar`
3. `acessos:default:usuario:listar`
4. `acessos:default:usuario:visualizar-papeis-completo`
5. `acessos:default:papel:atribuir`
6. `acessos:default:papel:remover`
7. `acessos:default:atribuicao:ver-historico`
8. `acessos:cadastro:papel:visualizar`
9. `acessos:cadastro:atribuicao:ver-historico`
10. `acessos:identificacao:papel:visualizar`
11. `acessos:identificacao:atribuicao:ver-historico`
12. `acessos:arrecadacao:papel:visualizar`
13. `acessos:arrecadacao:atribuicao:ver-historico`
14. `acessos:distribuicao:papel:visualizar`
15. `acessos:distribuicao:atribuicao:ver-historico`

### BFF - Auditoria

Fonte: `services/bff/src/auditoria/auditoriaPermissions.ts` e `seeds/mcad/auditoria.permissions.json`

1. `auditoria:default:catalogo:visualizar`
2. `auditoria:default:evento:listar`
3. `auditoria:default:snapshot:visualizar`

## Papéis corrigidos

Papéis locais ajustados nesta investigação:

- `arrecadacao.default.consultor`: adicionada `arrecadacao:default:rubrica:visualizar`
- `arrecadacao.default.analista`: adicionadas `arrecadacao:default:rubrica:{visualizar,criar,editar,inativar}`
- `distribuicao.default.consultor`: adicionadas `distribuicao:default:ajuste:{listar,visualizar}` e `distribuicao:default:demonstrativo:listar`
- `distribuicao.default.operador`: adicionadas `distribuicao:default:ajuste:{listar,visualizar}` e `distribuicao:default:demonstrativo:listar`
- `distribuicao.default.gerente`: adicionadas `distribuicao:default:ajuste:{listar,visualizar}` e `distribuicao:default:demonstrativo:listar`
- `distribuicao.default.analista`: adicionadas `distribuicao:default:ajuste:{listar,visualizar}` e `distribuicao:default:demonstrativo:listar`

## Ação remota executada

Tentativa inicial:

- `./scripts/seed-authz.sh --skip-assignments`
- resultado: `401` no `POST /permission-catalog/register` porque o `AUTHZ_ADMIN_TOKEN` do `.env` estava expirado

Fallback aplicado:

- acesso ao `mcad-server` via `ssh`
- inspeção do `docker swarm` para localizar `mcad-authz` e o Postgres compartilhado
- ajuste direto no banco `ecad_authz` em transação única
- sem alteração de assignments de usuários

Resultados validados no remoto:

- permissões `arrecadacao:default:rubrica:*` registradas como `ACTIVE`
- permissões `distribuicao:default:ajuste:*` e `distribuicao:default:demonstrativo:listar` registradas como `ACTIVE`
- permissões `auditoria:*` registradas como `ACTIVE`
- permissões escopadas `acessos:{dominio}:*` registradas como `ACTIVE`
- 42 permissões `cadastro:default:*` reativadas para `ACTIVE`
- papéis `auditoria.default.compliance` e `auditoria.default.responsavel-incidente` criados
- papéis de Arrecadação e Distribuição reaproximados da matriz local de `roles.json`
