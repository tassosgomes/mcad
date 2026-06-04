# Review da Tarefa 2.0 - Adicionar permissoes e guards de auditoria/compliance

## Resultado da Validacao Automatizada

APROVADA.

Comandos executados:

- `rtk npm run build` em `frontend`: passou. Executou `tsc -b && vite build`.
- `rtk npm run test` em `frontend`: passou. `29` arquivos de teste e `101` testes passaram.
- `rtk npm run build` em `services/bff`: passou. Executou `tsc -p tsconfig.json`.
- `rtk npm run test` em `services/bff`: passou. `8` testes passaram via `node --test dist/*.test.js dist/auditoria/*.test.js`.
- `rtk node -e "..."`: passou. Validou parse JSON de `seeds/mcad/auditoria.permissions.json`, `seeds/mcad/roles.json` e `seeds/mcad/assignments.json`.
- `rtk ./scripts/seed-authz.sh --dry-run --service auditoria --skip-assignments`: passou. O catalogo `auditoria` seria registrado com 3 permissoes.

Nao ha script de lint separado em `frontend/package.json` ou `services/bff/package.json`; o typecheck foi coberto pelos builds.

## Resultado da Revisao Tecnica

APROVADA.

Conformidade verificada contra `2_task.md`, `prd.md`, `techspec.md` e skills aplicaveis:

- As permissoes oficiais foram criadas em `seeds/mcad/auditoria.permissions.json`:
  - `auditoria:default:catalogo:visualizar`
  - `auditoria:default:evento:listar`
  - `auditoria:default:snapshot:visualizar`
- As roles de auditoria/compliance foram adicionadas com escopo coerente:
  - `auditoria.default.compliance` recebe catalogo e eventos, sem snapshot.
  - `auditoria.default.responsavel-incidente` recebe catalogo, eventos e snapshot.
- O seed script descobre `*.permissions.json`, portanto o novo catalogo de auditoria entra no fluxo existente sem ajuste em `scripts/seed-authz.sh`.
- O BFF usa `resolveAuthzContext` e permissoes efetivas vindas do authz para proteger:
  - catalogo com `auditoria:default:catalogo:visualizar`;
  - listagem/timeline/screen-access com `auditoria:default:evento:listar`;
  - detalhe com snapshot Ouro com `auditoria:default:snapshot:visualizar`.
- O BFF retorna 401 sem token e 403 sem permissao antes de consultar o audit-service nas rotas de lista/catalogo protegidas.
- O detalhe de evento Ouro sem permissao de snapshot retorna 403 e os testes confirmam que o corpo da resposta nao vaza dados do snapshot.
- A listagem de eventos remove campos `snapshot` quando o usuario nao possui `snapshot:visualizar`.
- O frontend removeu o fallback temporario baseado em permissoes de outros dominios e passou a usar constantes oficiais de auditoria para rota e sidebar.
- Os testes BFF e frontend cobrem os principais criterios da task: 401, 403, 200 com permissao, redacao de snapshot em lista e bloqueio especifico de snapshot em detalhe.

## Problemas Encontrados

Nenhum problema bloqueante identificado.

## Observacoes

- O enforcement real esta no BFF, como exigido. A SPA continua sendo apenas controle de navegacao/UX.
- A rota de relatorios de auditoria ja existia e nao foi tratada como criterio bloqueante desta task, pois o escopo solicitado cobre catalogo, listagem de eventos e detalhe com snapshot.

## Recomendacao Final

APROVADA.
