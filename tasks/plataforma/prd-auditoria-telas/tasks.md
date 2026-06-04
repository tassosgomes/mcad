# Resumo de Tarefas de Implementacao - Auditoria de telas por criticidade

## Visao Geral

Este plano transforma o PRD e a Tech Spec de Auditoria de telas por criticidade em tarefas executaveis. A entrega cria um catalogo governado Bronze/Prata/Ouro, usa o BFF Fastify como ponto autoritativo de captura de leituras `GET` Prata/Ouro, publica eventos `SCREEN_ACCESS` no `ecad-auditoria`, preserva a auditoria Bronze de alteracoes via handlers de dominio, e evolui a area de Auditoria no frontend para consulta de catalogo, eventos e snapshots Ouro com permissoes restritas.

## Skills e Padroes Consultados

| Skill / Padrao | Caminho | Influencia |
|---|---|---|
| `ai-tasks-creator` | `.agents/skills/ai-tasks-creator/SKILL.md` | Estrutura de tarefas, dependencias, criterios de sucesso e paralelizacao |
| Padroes locais de tasks | `tasks/plataforma/*/tasks.md` | Formato de resumo, rastreabilidade, cobertura e lanes |
| Padroes BFF Node/Fastify | `services/bff/src/*.ts` | Rotas `/api/auditoria/*`, proxy, testes `node:test`, authz context e timeouts |
| Padroes React/Authz | `frontend/src/shared/auth*`, `frontend/src/shared/authz/*` | `RequirePermission`, `PermissionsProvider`, rotas protegidas e UX por permissao efetiva |
| Padroes de permissoes | `seeds/mcad/*.permissions.json`, `seeds/mcad/roles.json` | Catalogo de permissoes e roles para auditoria/compliance |
| Padroes de auditoria de dominios | `services/*/audit/*` | Propagacao de contexto e continuidade de `USER_ACTION`/`DATA_CHANGE` |

## Fases de Implementacao

### Fase 1 - Governanca e seguranca

Criar o catalogo governado versionado, resolver aliases, definir a cobertura inicial Bronze/Prata/Ouro e disponibilizar permissoes de auditoria/compliance.

### Fase 2 - Captura transversal no BFF

Implementar o produtor HTTP de auditoria, o builder de `SCREEN_ACCESS` e o caminho auditado do proxy para `GET` Prata/Ouro com fail-closed e snapshot Ouro.

### Fase 3 - Consulta operacional e experiencia do auditor

Expor endpoints BFF para catalogo/eventos/detalhe, migrar a UI de Auditoria para nomes amigaveis, filtros de negocio e detalhe de snapshot restrito.

### Fase 4 - Cobertura inicial, observabilidade e validacao

Cobrir as telas iniciais dos dominios, propagar correlacao para comandos, adicionar metricas/logs/traces e fechar validacao automatizada/E2E.

## Tarefas

- [ ] 1.0 Criar catalogo governado de telas e operacoes auditadas
- [ ] 2.0 Adicionar permissoes e guards de auditoria/compliance
- [ ] 3.0 Implementar produtor HTTP e builder de `SCREEN_ACCESS` no BFF
- [ ] 4.0 Evoluir proxy BFF para captura de `GET` Prata/Ouro com fail-closed
- [ ] 5.0 Expor endpoints BFF de catalogo, eventos e detalhe de auditoria
- [ ] 6.0 Implementar UI React de catalogo, eventos e snapshot Ouro
- [ ] 7.0 Aplicar cobertura inicial por dominio e correlacao com alteracoes
- [ ] 8.0 Fechar observabilidade, documentacao e validacao E2E

## Rastreabilidade US -> Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| Compliance consulta quem acessou tela sensivel e quando | 1.0, 3.0, 4.0, 5.0, 6.0 | Direta |
| Auditor identifica filtros e entidades consultadas em tela Prata | 1.0, 3.0, 4.0, 5.0, 6.0 | Direta |
| Gestor consulta classificacao Bronze/Prata/Ouro por tela | 1.0, 5.0, 6.0 | Direta |
| Responsavel por incidente visualiza snapshot Ouro | 2.0, 3.0, 4.0, 5.0, 6.0 | Direta |
| Product owner mantem Bronze como default | 1.0, 4.0, 7.0 | Direta |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---:|---|
| RF-01 Catalogo de classificacao de auditoria | 1.0, 5.0, 6.0 | Coberto |
| RF-02 Auditoria Bronze para alteracoes de dados | 7.0, 8.0 | Coberto |
| RF-03 Auditoria Prata para acessos de leitura | 1.0, 3.0, 4.0, 5.0, 6.0 | Coberto |
| RF-04 Auditoria Ouro com snapshot da consulta | 1.0, 2.0, 3.0, 4.0, 5.0, 6.0 | Coberto |
| RF-05 Consulta de eventos para investigacao | 2.0, 5.0, 6.0 | Coberto |
| RF-06 Governanca e minimizacao de dados | 1.0, 2.0, 3.0, 4.0, 8.0 | Coberto |
| RF-07 Cobertura inicial por dominio | 1.0, 7.0, 8.0 | Coberto |
| RF-08 Telas Ouro iniciais | 1.0, 4.0, 7.0, 8.0 | Coberto |

### Artefatos da TechSpec

| Artefato / Componente | Task | Status |
|---|---:|---|
| `services/bff/src/auditoria/screenAuditCatalog.ts` | 1.0 | Coberto |
| Catalogo compartilhado/copia para frontend | 1.0, 6.0 | Coberto |
| Aliases `CADASTRO_TITULARES`, `ARRECADACAO_PAGAMENTOS`, `ARRECADACAO_VERBAS` | 1.0, 7.0 | Coberto |
| Permissoes `auditoria:default:catalogo:visualizar` | 2.0, 5.0, 6.0 | Coberto |
| Permissoes `auditoria:default:evento:listar` | 2.0, 5.0, 6.0 | Coberto |
| Permissao `auditoria:default:snapshot:visualizar` | 2.0, 5.0, 6.0 | Coberto |
| `POST {AUDIT_BASE_URL}/api/v1/audit/events` | 3.0, 4.0 | Coberto |
| `SCREEN_ACCESS` com `screen.businessContext` | 3.0, 4.0 | Coberto |
| Snapshot Ouro com `statusCode`, headers permitidos, `body`, `capturedAtUtc`, `contentHash` | 3.0, 4.0 | Coberto |
| `services/bff/src/proxy.ts` caminho auditado | 4.0 | Coberto |
| Headers `X-Audit-*` e `traceparent` | 4.0, 7.0 | Coberto |
| `GET /api/auditoria/catalogo` | 5.0 | Coberto |
| `GET /api/auditoria/eventos` | 5.0 | Coberto |
| `GET /api/auditoria/eventos/:eventId` | 5.0 | Coberto |
| Frontend `features/auditoria` | 6.0 | Coberto |
| Metricas e logs estruturados BFF | 8.0 | Coberto |
| E2E Playwright de auditoria | 8.0 | Coberto |

### Categorias Obrigatorias

| # | Categoria | Task(s) | Status |
|---|---|---:|---|
| 1 | Setup / Configuracao | 1.0, 2.0, 8.0 | Coberto |
| 2 | Modelos de Dados | 1.0, 3.0 | Coberto sem tabela nova no MCAD |
| 3 | Logica de Negocio | 1.0, 3.0, 4.0, 7.0 | Coberto |
| 4 | Endpoints / Interfaces | 5.0 | Coberto |
| 5 | Integracoes Externas | 2.0, 3.0, 5.0, 7.0 | Coberto |
| 6 | Validacoes e Erros | 1.0, 2.0, 4.0, 5.0 | Coberto |
| 7 | Testes | Subtarefas em todas as tasks | Coberto |
| 8 | Observabilidade | 3.0, 4.0, 8.0 | Coberto |
| 9 | Documentacao | 1.0, 8.0 | Coberto |
| 10 | Seguranca | 1.0, 2.0, 3.0, 4.0, 5.0, 6.0 | Coberto |

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|---|---|---|
| Lane A - Catalogo e governanca | 1.0 -> 7.0 | Define classificacao, aliases, telas Ouro obrigatorias e cobertura por dominio |
| Lane B - Autorizacao | 2.0 | Pode iniciar apos 1.0 definir permissoes e contratos de consulta |
| Lane C - Captura BFF | 3.0 -> 4.0 | Caminho critico para registrar Prata/Ouro antes de expor resposta |
| Lane D - Consulta BFF | 5.0 | Pode iniciar apos 2.0 e usar contratos de 3.0 para shape do evento |
| Lane E - Frontend Auditoria | 6.0 | Pode iniciar com mocks apos 1.0, 2.0 e 5.0 definirem contratos |
| Lane F - Validacao final | 8.0 | Fecha a entrega apos captura, consulta, frontend e cobertura inicial |

### Caminho Critico

`1.0 -> 3.0 -> 4.0 -> 7.0 -> 8.0`

Caminho de consulta e permissao: `1.0 -> 2.0 -> 5.0 -> 6.0 -> 8.0`.

### Diagrama de Dependencias

```text
1.0 (catalogo governado)
+-- 2.0 (permissoes/guards) -> 5.0 (endpoints consulta) -> 6.0 (frontend) --+
+-- 3.0 (producer/builder) -> 4.0 (proxy auditado) -> 7.0 (cobertura) -----+
                                                                            |
                                                                            v
                                                                    8.0 (validacao)
```

## Proximo Passo

Executar as tarefas em ordem de dependencia. A implementacao deve comecar por `1_task.md` e so seguir para captura BFF depois que o catalogo e seus testes de consistencia estiverem aprovados.
