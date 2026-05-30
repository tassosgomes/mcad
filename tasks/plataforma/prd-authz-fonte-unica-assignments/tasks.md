# Resumo de Tarefas de Implementacao - ecad-authz como Fonte Unica de Assignments

## Visao Geral

Este plano transforma o PRD e a Tech Spec em tarefas executaveis para migrar o MCAD para um modelo em que o `ecad-authz` e a fonte unica de associacoes usuario/perfil. O Logto permanece como IdP OIDC, mas deixa de criar, atribuir, publicar ou influenciar roles de negocio. A entrega cobre `ecad-authz`, `identity-sync-api`, scripts de migracao/provisionamento, BFF, frontend, `ai-orchestrator`, observabilidade e cutover QA.

## Skills e Padroes Consultados

| Skill / Padrao | Caminho | Influencia |
|---|---|---|
| `ai-tasks-creator` | `.agents/skills/ai-tasks-creator/SKILL.md` | Estrutura de tarefas, dependencias e paralelizacao |
| Padroes locais de tasks | `tasks/plataforma/*/tasks.md` | Formato de resumo, rastreabilidade, criterios e lanes |
| Padroes BFF Node/Fastify | `services/bff/src/*.ts` | Rotas `/api/me`, `/api/acessos/*`, testes `node:test` e cache de permissoes |
| Padroes React/Authz | `frontend/src/shared/auth*` | `PermissionsProvider`, `RequirePermission`, `Can`, callback OIDC e UX por permissao efetiva |
| Padroes identity-sync | `services/identity-sync-api/src/*.ts` | Publicacao de eventos `identity.user.*` e cliente Logto |
| Padroes de seed/migracao authz | `scripts/seed-authz.sh`, `seeds/mcad/*.json` | Catalogo oficial de roles e fixtures explicitas |

## Fases de Implementacao

### Fase 1 - Fechamento da origem autoritativa

Remove definitivamente a autoatribuicao por roles do IdP no `ecad-authz` e ajusta o `identity-sync-api` para publicar somente identidade/status.

### Fase 2 - Migracao segura e bootstrap sem roles

Cria a migracao dry-run/apply/report das roles existentes do Logto para assignments oficiais no `ecad-authz` e reescreve o provisionamento Logto para autenticacao pura.

### Fase 3 - Operacao administrativa e UX por permissoes efetivas

Evolui o BFF como gateway unico de acessos, integra historico de Auditoria, ajusta cache/versionamento e migra o frontend para `/api/me` e `/api/me/permissions`.

### Fase 4 - Servicos auxiliares, observabilidade e cutover

Remove confianca residual em roles/scopes do JWT nos servicos auxiliares, adiciona validacoes estaticas/QA e executa o cutover com comparacao antes/depois.

## Tarefas

- [x] 1.0 Remover autoassignment por roles do IdP no `ecad-authz`
- [x] 2.0 Publicar sync de identidade sem roles no `identity-sync-api`
- [x] 3.0 Criar migracao controlada de roles Logto para assignments `ecad-authz`
- [x] 4.0 Reescrever provisionamento Logto para autenticacao pura e fixtures explicitas
- [x] 5.0 Evoluir BFF de Acessos, Auditoria e cache/versionamento de permissoes
- [x] 6.0 Migrar frontend para permissoes efetivas e tela completa de Atribuicoes
- [x] 7.0 Remover autorizacao por roles/scopes JWT de servicos auxiliares
- [x] 8.0 Executar cutover, validacao QA, observabilidade e documentacao final

## Rastreabilidade US -> Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| Gestor de Acessos atribui/remove papeis por tela segura | 5.0, 6.0, 8.0 | Direta |
| Usuario MCAD recebe mudancas sem relogar | 5.0, 6.0, 8.0 | Direta |
| Administrador de Plataforma provisiona Logto sem papeis de negocio | 3.0, 4.0, 8.0 | Direta |
| Auditor rastreia atribuicoes/remocoes | 5.0, 6.0, 8.0 | Direta |
| Desenvolvedor de Servico usa permissao efetiva/PDP | 1.0, 5.0, 7.0, 8.0 | Direta |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---:|---|
| RF-01 Sync de identidade sem assignments vindos do IdP | 1.0, 2.0 | Coberto |
| RF-02 Migracao controlada de dados existentes | 3.0, 8.0 | Coberto |
| RF-03 Provisionamento Logto restrito a autenticacao | 4.0, 8.0 | Coberto |
| RF-04 Gestao de associacoes no BFF e UI | 5.0, 6.0 | Coberto |
| RF-05 Remocao de roles como base de UX no frontend | 6.0, 8.0 | Coberto |
| RF-06 Servicos auxiliares sem confiar em roles/scopes JWT | 7.0, 8.0 | Coberto |
| RF-07 Cutover e validacao final | 8.0 | Coberto |

### Artefatos da TechSpec

| Artefato / Componente | Task | Status |
|---|---:|---|
| `/home/tsgomes/github-tassosgomes/ecad-authz` `SyncIdentityUserUseCase` | 1.0 | Coberto |
| `services/identity-sync-api/src/logto.ts` | 2.0 | Coberto |
| `services/identity-sync-api/src/events.ts` | 2.0 | Coberto |
| `services/identity-sync-api/src/sync.ts` | 2.0 | Coberto |
| `scripts/migrate-logto-roles-to-authz-assignments.*` | 3.0 | Coberto |
| `seeds/mcad/roles.json` | 3.0 | Coberto |
| `.env_qa` usuarios obrigatorios de validacao | 3.0, 8.0 | Coberto |
| `scripts/provision-logto.sh` | 4.0 | Coberto |
| `seeds/mcad/assignments.json` | 4.0 | Coberto |
| `services/bff/src/acessosRoutes.ts` | 5.0 | Coberto |
| `services/bff/src/historicoRoutes.ts` | 5.0 | Coberto |
| `services/bff/src/meRoutes.ts` / `meCache.ts` | 5.0 | Coberto |
| `frontend/src/shared/auth/CallbackPage.tsx` | 6.0 | Coberto |
| `frontend/src/shared/auth/AuthProvider.tsx` | 6.0 | Coberto |
| `frontend/src/shared/auth/authorizedRoutes.ts` | 6.0 | Coberto |
| `frontend/src/shared/authz/*` | 6.0 | Coberto |
| `frontend/src/features/autorizacao/*` | 6.0 | Coberto |
| `frontend/src/features/auditoria/*` | 6.0 | Coberto |
| `services/ai-orchestrator/src/*` | 7.0 | Coberto |
| Busca estatica por `roles`, `hasRole`, `scope`, `x-mcad-roles` | 7.0, 8.0 | Coberto |
| Documentacao ADR/operacional e evidencia QA | 8.0 | Coberto |

### Categorias Obrigatorias

| # | Categoria | Task(s) | Status |
|---|---|---:|---|
| 1 | Setup / Configuracao | 3.0, 4.0, 8.0 | Coberto |
| 2 | Modelos de Dados | 1.0, 3.0 | Coberto sem novas tabelas MCAD |
| 3 | Logica de Negocio | 1.0, 5.0, 6.0, 7.0 | Coberto |
| 4 | Endpoints / Interfaces | 5.0, 7.0 | Coberto |
| 5 | Integracoes Externas | 2.0, 3.0, 4.0, 5.0 | Coberto |
| 6 | Validacoes e Erros | 2.0, 3.0, 5.0, 6.0, 8.0 | Coberto |
| 7 | Testes | Subtarefas em todas as tasks | Coberto |
| 8 | Observabilidade | 1.0, 2.0, 5.0, 7.0, 8.0 | Coberto |
| 9 | Documentacao | 2.0, 4.0, 8.0 | Coberto |
| 10 | Seguranca | Todas | Coberto |

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|---|---|---|
| Lane A - Origem autoritativa | 1.0 -> 2.0 | Caminho critico para impedir que roles do IdP gerem assignments |
| Lane B - Dados e bootstrap | 3.0 -> 4.0 | Migracao validada antes de desligar roles/customizer no Logto |
| Lane C - BFF e Auditoria | 5.0 | Pode iniciar apos 1.0 com contrato do `ecad-authz` estabilizado |
| Lane D - Frontend | 6.0 | Pode iniciar com mocks apos 5.0 definir contratos BFF |
| Lane E - Servicos auxiliares | 7.0 | Paralelizavel apos 5.0 definir resolucao confiavel de contexto |
| Lane F - Cutover | 8.0 | Fecha a entrega apos migracao, provisionamento, UX e servicos auxiliares |

### Caminho Critico

`1.0 -> 2.0 -> 3.0 -> 4.0 -> 8.0`

Caminho funcional de mesma importancia para operacao administrativa: `1.0 -> 5.0 -> 6.0 -> 8.0`.

### Diagrama de Dependencias

```text
1.0 (ecad-authz sem autoassignment)
+-- 2.0 (identity-sync sem roles) -> 3.0 (migracao) -> 4.0 (Logto auth-only) --+
+-- 5.0 (BFF Acessos + Auditoria + cache) -> 6.0 (Frontend Atribuicoes) ------+
                                                         |
                                                         +-> 7.0 (AI/servicos)-+
                                                                                |
                                                                                v
                                                                        8.0 (cutover QA)
```

## Proximo Passo

Executar as tarefas em ordem de dependencia, validando cada arquivo individual antes de avancar para o cutover.
