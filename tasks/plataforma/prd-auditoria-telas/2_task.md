---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>plataforma/authz/auditoria</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>database,http_server,external_apis</dependencies>
<unblocks>5.0, 6.0, 8.0</unblocks>
</task_context>

# Tarefa 2.0: Adicionar permissoes e guards de auditoria/compliance

## Relacionada as User Stories

- Compliance consulta catalogo e eventos de auditoria.
- Responsavel por incidente visualiza snapshot Ouro somente com permissao forte.
- Usuario sem permissao adequada recebe acesso negado.

## Visao Geral

Adicionar as permissoes oficiais de auditoria e garantir que BFF e frontend usem permissao efetiva vinda do `ecad-authz`. Snapshot Ouro nao pode ser exibido nem retornado sem `auditoria:default:snapshot:visualizar`.

## Requisitos

- Criar permissoes `auditoria:default:catalogo:visualizar`, `auditoria:default:evento:listar` e `auditoria:default:snapshot:visualizar`.
- Atualizar seeds/roles para perfis autorizados de auditoria/compliance.
- Substituir fallback temporario de permissao da rota de Auditoria quando o catalogo definitivo estiver disponivel.
- Aplicar guards no BFF para catalogo, listagem de eventos e detalhe com snapshot.
- Retornar 403 sem vazar dados de snapshot quando a permissao estiver ausente.
- Manter autorizacao real no BFF/backend, nunca apenas na SPA.

## Arquivos Envolvidos

- **Modificar:**
  - `seeds/mcad/*.permissions.json`
  - `seeds/mcad/roles.json`
  - `scripts/seed-authz.sh`, se necessario
  - `services/bff/src/auditoriaRoutes.ts`
  - `services/bff/src/auditoriaRoutes.test.ts`
  - `frontend/src/app/router/routes.tsx`
  - `frontend/src/shared/auth/authorizedRoutes.ts`, se aplicavel
- **Referencia:**
  - `services/bff/src/authzContext.ts`
  - `frontend/src/shared/auth/RequirePermission.tsx`
  - `frontend/src/shared/authz/*`

## Subtarefas

- [ ] 2.1 Identificar o formato atual de seeds de permissoes e roles.
- [ ] 2.2 Adicionar permissoes de catalogo, evento e snapshot no dominio `auditoria`.
- [ ] 2.3 Associar permissoes aos papeis apropriados de auditoria/compliance, sem dar snapshot a perfis amplos por acidente.
- [ ] 2.4 Atualizar testes de estrutura de catalogo de permissoes, se existirem para o dominio.
- [ ] 2.5 Criar helper/constantes de permissao no BFF para evitar strings duplicadas.
- [ ] 2.6 Implementar testes BFF para 401 sem token, 403 sem permissao, 200 com permissao e 403 especifico para snapshot.
- [ ] 2.7 Atualizar rota do frontend para usar permissoes `auditoria:default:*` oficiais.
- [ ] 2.8 Validar que o usuario sem `snapshot:visualizar` pode listar eventos permitidos, mas nao ver o corpo de snapshot.

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 5.0, 6.0, 8.0
- Paralelizavel: Sim. Pode rodar em paralelo com 3.0 apos o catalogo definir os contratos de consulta.

## Rastreabilidade

- Cobre RF-04, RF-05 e RF-06.
- Evidencia esperada: testes 403 para snapshot e rota de Auditoria protegida por permissoes oficiais.

## Detalhes de Implementacao

Usar o `resolveAuthzContext` do BFF para obter permissoes efetivas. O frontend pode esconder botoes e rotas, mas o BFF deve ser o ponto de enforcement. Caso existam perfis builtin, atualizar fixtures de QA para conter ao menos um usuario auditor com snapshot e um usuario auditor sem snapshot.

## Criterios de Sucesso Verificaveis

- [ ] Seeds de permissoes contem as tres novas permissoes de auditoria.
- [ ] Roles de auditoria/compliance recebem permissoes coerentes, com snapshot restrito.
- [ ] BFF retorna 403 para detalhe Ouro sem `auditoria:default:snapshot:visualizar`.
- [ ] Frontend nao usa mais permissao temporaria para entrar em Auditoria quando as permissoes oficiais estiverem disponiveis.
- [ ] Testes de BFF e de frontend relacionados a permissao passam.
