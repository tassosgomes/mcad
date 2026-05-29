---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>plataforma/bff/acessos</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>fastify,ecad-authz,auditoria,cache</dependencies>
<unblocks>6.0, 7.0, 8.0</unblocks>
</task_context>

# Tarefa 5.0: Evoluir BFF de Acessos, Auditoria e cache/versionamento de permissoes

## Relacionada as User Stories

- Gestor de Acessos opera assignments pelo MCAD, via BFF.
- Auditor consulta historico consolidado de atribuicoes/remocoes.
- Usuario recebe concessao/revogacao em ate 5 minutos sem relogar.

## Visao Geral

Evoluir o BFF Fastify como fronteira unica para gestao operacional de acessos: busca/autocomplete de usuarios, catalogo de papeis com filtros, atribuir/remover, historico via Auditoria e invalidacao/versionamento de `/api/me` e `/api/me/permissions`.

## Requisitos

- Frontend nao deve chamar `ecad-authz` diretamente em fluxos administrativos comuns.
- Implementar/ajustar `GET /api/acessos/usuarios?query=&page=&size=`.
- Implementar filtros em `GET /api/acessos/papeis` por dominio, tipo e status quando suportado.
- Manter wrappers de atribuir/remover com mapeamento de 401/403/409/503.
- Implementar `GET /api/acessos/atribuicoes/historico?userId=&roleKey=&page=&size=` via Auditoria.
- Retornar `x-authz-version` quando upstream disponibilizar versao e invalidar cache apos mutacoes.
- Garantir `ME_CACHE_TTL_SECONDS <= 300` ou configuracao equivalente.
- Logs estruturados sem tokens.

## Arquivos Envolvidos

- **Modificar:**
  - `services/bff/src/acessosRoutes.ts`
  - `services/bff/src/acessosRoutes.test.ts`
  - `services/bff/src/historicoRoutes.ts`
  - `services/bff/src/historicoRoutes.test.ts`
  - `services/bff/src/meRoutes.ts`
  - `services/bff/src/meCache.ts`
  - `services/bff/src/server.ts`
  - `services/bff/src/config.ts`
  - `.env.example`
- **Referencia:**
  - `docs/adr/0008-bff-gateway-cross-cutting.md`
  - `seeds/mcad/acessos.permissions.json`
  - Contratos `ecad-authz` `/v1/users`, `/v1/roles`, `/v1/users/{userId}/roles`

## Subtarefas

- [ ] 5.1 Inventariar rotas atuais de `acessosRoutes.ts`, `historicoRoutes.ts`, `meRoutes.ts` e helpers compartilhados.
- [ ] 5.2 Implementar `GET /api/acessos/usuarios` com query paginada, permissao exigida e resposta sem PII excessiva.
- [ ] 5.3 Ajustar `GET /api/acessos/papeis` para filtros de dominio, tipo/status e indicacao de papel critico.
- [ ] 5.4 Ajustar `GET /api/acessos/assignments` para busca por usuario e papeis atuais com resposta estavel para UI.
- [ ] 5.5 Garantir `POST /api/acessos/papeis/atribuir` com auditoria, `409` para duplicidade e invalidacao de cache.
- [ ] 5.6 Garantir `DELETE /api/acessos/papeis/atribuir/:assignmentId` com confirmacao pelo frontend, auditoria e invalidacao.
- [ ] 5.7 Implementar proxy de historico de assignments via Auditoria, com fallback `503 AUDIT_UNAVAILABLE`.
- [ ] 5.8 Propagar `x-authz-version` em `/api/me/permissions` e usar a versao para invalidar/refazer cache apos mutacoes.
- [ ] 5.9 Adicionar metricas `bff_acessos_assignment_requests_total` e latencia quando houver padrao existente.
- [ ] 5.10 Atualizar testes para 401, 403, 409, 503, filtros, historico e invalidacao de cache.

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 6.0, 7.0, 8.0
- Paralelizavel: Sim. Pode rodar em paralelo a 2.0/3.0/4.0, desde que contratos de migracao/cutover sejam coordenados.

## Rastreabilidade

- Cobre RF-04 e parte de RF-07.
- Evidencia esperada: BFF e unica fronteira da UI para gestao de assignments.

## Detalhes de Implementacao

Contratos BFF alvo:

```text
GET    /api/me
GET    /api/me/permissions
GET    /api/acessos/usuarios?query=&page=&size=
GET    /api/acessos/assignments?page=&size=&query=
GET    /api/acessos/papeis?domain=&type=&status=
POST   /api/acessos/papeis/atribuir
DELETE /api/acessos/papeis/atribuir/:assignmentId
GET    /api/acessos/atribuicoes/historico?userId=&roleKey=&page=&size=
```

Erros devem seguir envelope local com `code`, `message` e `correlationId` quando disponivel.

## Criterios de Sucesso Verificaveis

- [ ] `cd services/bff && npm test` passa.
- [ ] `cd services/bff && npm run build` passa.
- [ ] Busca de usuarios retorna resultados por nome, email ou identificador.
- [ ] Atribuir/remover invalida cache e reflete nova `authzVersion`.
- [ ] Historico indisponivel retorna `503 AUDIT_UNAVAILABLE` sem quebrar demais rotas.
- [ ] Nenhuma rota operacional exige roles do JWT para autorizar.
- [ ] Teste prova que novo assignment libera permissao sem relogin quando cache e atualizado/invalido.
