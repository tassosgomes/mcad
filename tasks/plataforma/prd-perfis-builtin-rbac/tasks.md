# Resumo de Tarefas de Implementação — Catálogo de Perfis Built-in (Framework RBAC + Piloto Distribuição)

## Visão Geral

Materializa o framework RBAC aprovado: 4 níveis por domínio de negócio (Consultor/Operador/Gerente/Analista com Gerente e Analista segregados), 5 categorias de permissão, novo domínio transversal `acessos` (Gestor + Consultor de Acessos), e mascaramento server-side de CPF em Cadastro. Piloto integral em Distribuição. Os 4 ADRs (0006–0009) já estão aprovados em `docs/adr/`.

## Skills de Stack Consultadas

| Skill | Caminho | Influência |
|-------|---------|------------|
| `java-architecture` | `~/.claude/skills/java-architecture/` | Estrutura `*-api`/`*-application`/`*-domain`; padrão de annotations e DI |
| `java-testing` | `~/.claude/skills/java-testing/` | JUnit 5 + AssertJ + Mockito (AAA); WireMock para `ecad-authz`; naming `methodName_Condition_ExpectedBehavior` |
| `csharp-dotnet-architecture` | `~/.claude/skills/csharp-dotnet-architecture/` | Camadas numeradas 1-Services/2-Application/...; DI scoped; CQRS handler |
| `dotnet-testing` | `~/.claude/skills/dotnet-testing/` | xUnit + AwesomeAssertions (AAA); WebApplicationFactory + Testcontainers PostgreSQL; mock HTTP para `ecad-authz` |
| `react-architecture` | `~/.claude/skills/react-architecture/` | `src/features/*` + `src/shared/auth|authz`; routing via `routes.tsx` |
| `react-testing` | `~/.claude/skills/react-testing/` | Vitest + RTL + `userEvent`; queries semânticas; mock de `usePermissions` |
| `common-restful-api` | `~/.claude/skills/common-restful-api/` | `ErrorResponse {code, message, correlationId}`; versionamento `/api/v1` |
| `common-roles-naming` | `~/.claude/skills/common-roles-naming/` | Naming 4-segmentos preservado |

## Fases de Implementação

### Fase 1 — Pré-requisito (paralelo / bloqueante para Fase 3)

Investigar e documentar o padrão de propagação de JWT em chamadas ACL `distribuicao-api` → `cadastro-api` (afeta diretamente o mascaramento de CPF da Fase 3).

### Fase 2 — Catálogo

Aplicar as mudanças nos seeds e re-seedar o `ecad-authz` em DEV. Sem mudanças de código de produção.

### Fase 3 — Implementação Backend

Implementar mascaramento de CPF em Cadastro (.NET) e ampliar a matriz de testes de authorization enforcement em Distribuição (Java). Não há código novo em backends de domínio Java; apenas testes.

### Fase 4 — Implementação BFF

Implementar as rotas novas no BFF: gestão de acessos (com filtro escopado) e proxy de timeline de auditoria.

### Fase 5 — Implementação Frontend

Telas de Acessos (`/autorizacao/atribuicoes`, `/autorizacao/meu-dominio`) e aba "Histórico de Alterações" + gating granular em `ProcessoDetailPage`.

### Fase 6 — Documentação e fechamento

Atualizar índice de ADRs, registrar nota no `relatorio-final.md`, e opcionalmente adicionar specs E2E Playwright se a infraestrutura E2E do `finalizar-integracao-authz` estiver em vigor.

## Tarefas

- [x] 0.0 Investigar propagação de JWT em ACL Distribuição → Cadastro (pré-requisito)
- [ ] 1.0 Atualizar catálogo de permissões e perfis built-in nos seeds + re-seed em DEV — implementação e dry-run concluídos; aplicação DEV bloqueada por `AUTHZ_ADMIN_TOKEN` ausente.
- [x] 2.0 Implementar mascaramento server-side de CPF no Cadastro (.NET) via permission-aware mapper
- [ ] 3.0 Ampliar matriz de testes de authorization enforcement em Distribuição (Java) — implementação concluída; validação Maven bloqueada por `audit-sdk-core:1.0.0` no GitHub Packages com 401.
- [x] 4.0 Implementar rotas BFF de gestão de acessos (filtro escopado + atribuir/remover/catálogo)
- [x] 5.0 Implementar rota BFF de histórico de alterações (proxy ao `ecad-auditoria`)
- [x] 6.0 Implementar telas de Acessos no frontend (`AtribuicoesPage`, `MeuDominioPage`)
- [x] 7.0 Implementar aba "Histórico de Alterações" + gating granular em `ProcessoDetailPage`
- [x] 8.0 Atualizar documentação (ADR README, relatorio-final.md) e specs E2E opcionais

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|------------|--------------------|-------------------|
| US-01 (Diretor de Governança — irreversíveis só Gerente + auditoria) | 1.0, 3.0, 7.0 | Direta |
| US-02 (Analista — opera sem aprovação a cada passo, mantém ultra-sensíveis) | 1.0, 3.0 | Direta |
| US-03 (Gerente — ver histórico do seu domínio) | 5.0, 7.0 | Direta |
| US-04 (Gestor de Acessos — atribuir/remover papéis) | 1.0, 4.0, 6.0 | Direta |
| US-05 (Auditor / Compliance Officer — Consultor de Acessos + escopo do Gerente) | 1.0, 4.0, 6.0 | Direta |
| US-06 (Operador de Suporte — LGPD com CPF mascarado) | 0.0, 1.0, 2.0 | Direta |
| US-07 (Desenvolvedor mcad — framework replicável) | 1.0, 8.0 (ADRs já feitos) | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 (Estrutura canônica de 4 níveis) | 1.0 | ✅ Coberto |
| RF-02 (Taxonomia de 5 categorias) | 1.0 (descriptions categorizadas) | ✅ Coberto |
| RF-03 (Mapa Distribuição) | 1.0, 3.0 (validação via testes) | ✅ Coberto |
| RF-04 (Perfis `acessos.default.gestor` e `consultor`) | 1.0, 4.0, 6.0 | ✅ Coberto |
| RF-05 (Visualização escopada pelo Gerente) | 4.0, 6.0 | ✅ Coberto |
| RF-06 (Naming e ciclo de vida) | 1.0 | ✅ Coberto |
| RF-07 (Backward compatibility) | 1.0 (carve-out CPF em analista existente), 2.0 (preserva visibilidade) | ✅ Coberto |
| RF-08 (ADR + governança) | ✅ Feito (ADRs 0006-0009 em `docs/adr/`) + 8.0 (índice) | ✅ Coberto |

### Artefatos da TechSpec

| Artefato | Task | Status |
|----------|------|--------|
| `seeds/mcad/distribuicao.permissions.json` | 1.0 | ✅ |
| `seeds/mcad/cadastro.permissions.json` | 1.0 | ✅ |
| `seeds/mcad/acessos.permissions.json` (NOVO) | 1.0 | ✅ |
| `seeds/mcad/roles.json` | 1.0 | ✅ |
| `seeds/mcad/assignments.json` | 1.0 | ✅ |
| `docs/adr/0006-perfis-built-in-rbac.md` | — (já criado) | ✅ |
| `docs/adr/0007-dominio-acessos-segregado.md` | — (já criado) | ✅ |
| `docs/adr/0008-bff-gateway-cross-cutting.md` | — (já criado) | ✅ |
| `docs/adr/0009-cpf-masking-permission-aware-mapper.md` | — (já criado) | ✅ |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/Authorization/ICurrentUserPermissions.cs` | 2.0 | ✅ |
| `services/cadastro-api/2-Application/Cadastro.Application/Titulares/DocumentoMasking.cs` | 2.0 | ✅ |
| `services/cadastro-api/1-Services/Cadastro.API/Authorization/HttpContextCurrentUserPermissions.cs` | 2.0 | ✅ |
| Modificações em `ListarTitularesQueryHandler.cs` + outros handlers | 2.0 | ✅ |
| `Cadastro.API/Program.cs` (DI registration) | 2.0 | ✅ |
| `Cadastro.UnitTests/.../DocumentoMaskingTests.cs` | 2.0 | ✅ |
| `Cadastro.IntegrationTests/.../TitularCpfMaskingTests.cs` | 2.0 | ✅ |
| Ampliação de `AuthzPermissionEnforcementTest.java` (Distribuição) | 3.0 | ✅ |
| `services/bff/src/acessosRoutes.ts` (NOVO) | 4.0 | ✅ |
| `services/bff/src/acessosRoutes.test.ts` (NOVO) | 4.0 | ✅ |
| `services/bff/src/historicoRoutes.ts` (NOVO) | 5.0 | ✅ |
| `services/bff/src/historicoRoutes.test.ts` (NOVO) | 5.0 | ✅ |
| `services/bff/src/server.ts` (modificado) | 4.0 + 5.0 | ✅ |
| `services/bff/src/config.ts` + `.env.example` | 5.0 | ✅ |
| `frontend/src/features/autorizacao/atribuicoes/AtribuicoesPage.tsx` + test | 6.0 | ✅ |
| `frontend/src/features/autorizacao/meu-dominio/MeuDominioPage.tsx` + test | 6.0 | ✅ |
| `frontend/src/features/distribuicao/processos/components/HistoricoAlteracoesTab.tsx` + test | 7.0 | ✅ |
| `frontend/src/app/router/routes.tsx` (modificado) | 6.0 | ✅ |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (modificado) | 6.0 | ✅ |
| `frontend/src/features/distribuicao/processos/pages/ProcessoDetailPage.tsx` (modificado) | 7.0 | ✅ |
| `frontend/src/features/distribuicao/processos/components/ProcessoActions.tsx` (modificado) | 7.0 | ✅ |
| `docs/adr/README.md` (modificado) | 8.0 | ✅ |
| `docs/migracao-authz/relatorio-final.md` (modificado) | 8.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Skill Relacionada | Status |
|---|-----------|---------------|-------------------|--------|
| 1 | Setup / Configuração | 1.0 (seeds), 5.0 (env vars `AUDIT_BASE_URL`) | `[stack]-dependency-config` | ✅ |
| 2 | Modelos de Dados | N/A — feature não introduz tabelas, migrations, ou schemas de banco. Catálogo de permissões fica em JSON seedado no `ecad-authz`. | `[stack]-architecture` | ✅ |
| 3 | Lógica de Negócio | 2.0 (mascaramento CPF), 4.0 (filtro escopado), 5.0 (gating audit) | `[stack]-architecture` | ✅ |
| 4 | Endpoints / Interfaces | 4.0 (4 endpoints BFF acessos), 5.0 (1 endpoint BFF histórico) | `common-restful-api` | ✅ |
| 5 | Integrações Externas | 4.0 (consumo `ecad-authz` `/v1/users`), 5.0 (consumo `ecad-auditoria` timeline) | `[stack]-dependency-config` | ✅ |
| 6 | Validações e Erros | Subtarefas em 4.0 e 5.0 (envelope `ErrorResponse`, 401/403/503) | `[stack]-code-quality` | ✅ |
| 7 | Testes | Subtarefas em 2.0 (unit + integration .NET), 3.0 (matriz Java), 4.0/5.0 (BFF), 6.0/7.0 (RTL) | `[stack]-testing` | ✅ |
| 8 | Observabilidade | Subtarefa em 4.0 + 5.0 (logs estruturados + métricas RED) — padrão BFF já existente | `[stack]-observability` | ✅ |
| 9 | Documentação | 8.0 (ADR README + relatorio-final.md) | — | ✅ |
| 10 | Segurança | Todas — toda entrega é sobre authz/governança. Especificamente: 1.0 (catálogo), 2.0 (LGPD/CPF), 3.0 (matriz de regressão), 4.0/5.0 (gating no BFF) | `[stack]-production-readiness` | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane Pré | 0.0 | Investigação de propagação JWT — única tarefa não-código; pode rodar enquanto Lane A executa. Bloqueia 2.0 apenas para confirmar comportamento esperado em produção. |
| Lane A | 1.0 | Catálogo / seeds — único bloqueante para Fases 3-6. Roda primeiro. |
| Lane B | 2.0, 3.0 | Após 1.0: backends (.NET + Java) em paralelo. Times diferentes. |
| Lane C | 4.0, 5.0 | Após 1.0: dois grupos de rotas no BFF em paralelo (mesmo arquivo `server.ts` precisa ser modificado por ambos — coordenar merge). |
| Lane D | 6.0 | Após 4.0: frontend de Acessos (consome rotas de 4.0). |
| Lane E | 7.0 | Após 5.0: frontend de ProcessoDetailPage (consome rota de 5.0). |
| Lane F | 8.0 | Após 6.0 e 7.0: documentação e fechamento. |

### Caminho Crítico

`1.0 → 5.0 → 7.0 → 8.0` (catálogo → BFF histórico → Frontend Distribuição → docs).

Caminho alternativo de mesma duração estimada: `1.0 → 4.0 → 6.0 → 8.0`.

### Diagrama de Dependências

```
                       ┌──── 0.0 (investigação JWT — bloqueia 2.0)
                       │
                       ▼
       1.0 (seeds) ────┼────► 2.0 (.NET CPF masking)
            │          │
            │          ├────► 3.0 (testes Java)
            │          │
            │          ├────► 4.0 (BFF Acessos) ──► 6.0 (Frontend Acessos) ──┐
            │          │                                                       │
            │          └────► 5.0 (BFF Histórico) ──► 7.0 (Frontend Hist.) ───┤
            │                                                                  │
            └──────────────────────────────────────────────────────────────────┴──► 8.0 (docs)
```
