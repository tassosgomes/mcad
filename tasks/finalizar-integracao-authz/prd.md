# PRD — Finalização da Integração ecad-authz × MCAD (Casos de Teste)

> Mini-PRD derivado de `docs/migracao-authz/{prd.md, relatorio-final.md, proximos-passos.md}`.
> Objetivo desta entrega: fechar os gaps táticos remanescentes da migração e criar a matriz de testes de regressão + E2E que valida a integração ponta-a-ponta.

## 1. Contexto

A migração do MCAD para autorização fina centralizada no `ecad-authz` foi declarada **concluída em produção em 2026-05-15** (`docs/migracao-authz/relatorio-final.md`). 4 APIs (Cadastro, Identificacao, Arrecadacao, Distribuicao) + BFF + Frontend foram migrados para o padrão 4-segmentos (`dominio:default:recurso:acao`). 78–87 permissões + 6+ papéis estão registrados em `mcad-authz.tasso.dev.br`.

Restam pendências táticas (limpeza de `hasRole` no frontend, ampliação de cobertura de testes e criação da suite E2E) que impedem afirmar que a integração está 100% e que regressões sejam detectadas automaticamente. Este PRD agrupa essas pendências em um único entregável focado em **casos de teste**.

## 2. Objetivos

- **O1.** Remover os últimos resíduos de `hasRole` no frontend, completando a migração para `can()`.
- **O2.** Criar a suite E2E de autorização cobrindo as 4 APIs (10 cenários Playwright).
- **O3.** Ampliar a regressão de autorização nos 4 backends + BFF, garantindo que cada endpoint protegido tem teste para os 3 estados (sem JWT, sem permissão, com permissão).
- **O4.** Garantir a11y baseline nas 4 telas críticas.
- **O5.** Manter os totais de testes atuais (verde) e adicionar os novos sem regressão.

## 3. Não-Objetivos

- Implementar escopo `ASSOCIATION` (decisão de produto em aberto — fora desta entrega).
- Adicionar tracing OpenTelemetry estruturado para decisões authz (item separado).
- Reescrever o frontend para usar `@ecad/authz-react` em vez da camada própria `shared/authz/` (decisão consciente, ADR 0005).
- Implementar suite E2E para fluxos de negócio fora de autorização.
- Migrar a Admin UI do front para passar pelo BFF (item futuro do `relatorio-final §6`).

## 4. Personas e User Stories

| US | Persona | Story |
|----|---------|-------|
| US-01 | Desenvolvedor MCAD | Quero rodar `dotnet test` / `mvn test` / `npm test` localmente e ver TODA a matriz de autorização verde, sem flakes |
| US-02 | QA | Quero rodar `pnpm e2e` e validar consultor lê / analista escreve / sem papel = 403 nas 4 APIs em ≤ 5 min |
| US-03 | SRE | Quero que a pipeline CI bloqueie merges que quebrem enforcement de autorização |
| US-04 | Tech Lead | Quero o checklist da Tarefa 20 do PRD original (`docs/migracao-authz/prd.md §20`) 100% concluído, exceto os 4 itens explicitamente fora de escopo (Distribuição já contemplada) |
| US-05 | Acessibilidade (compliance) | Quero rotina automática de a11y em login, papéis e auditoria com zero violações bloqueantes |

## 5. Requisitos Funcionais

| RF | Descrição |
|----|-----------|
| RF-01 | `ProcessoCalculoPage` deve usar `can('distribuicao:default:processo:calcular')` em vez de `hasRole('analista-distribuicao')` |
| RF-02 | `AuthProvider`/`AuthContext` não devem mais expor `hasRole` (após RF-01) |
| RF-03 | Sidebar e routes devem usar `requiredPermissions` para "Auditoria" e "Copiloto", removendo TODOs |
| RF-04 | Cadastro API: matriz de 6 cenários por endpoint principal × 3 estados (401/403/200/201) |
| RF-05 | Identificacao API: idem |
| RF-06 | Arrecadacao API: idem + cobertura Testcontainers ampla por controller |
| RF-07 | Distribuicao API: idem |
| RF-08 | BFF: 5 cenários cobrindo `/api/me`, `/api/me/permissions`, `X-Authz-Version`, fallback 503 |
| RF-09 | Suite E2E Playwright: 10 cenários (CT-E2E-01..10) — consultor lê / analista escreve / sem papel = 403 / version push / revogação / logout |
| RF-10 | A11y baseline: 4 rotas com `axe-playwright` retornando zero violações bloqueantes |

## 6. Requisitos Não-Funcionais

| RNF | Descrição |
|-----|-----------|
| RNF-01 | Toda suite (`pnpm e2e` + `dotnet test` + `mvn test`) ≤ 15 min na CI |
| RNF-02 | E2E ≤ 5 min com compose `docker-compose.dev.yml` ativo |
| RNF-03 | Sem flakes ≥ 1% (retry 1×, falha após 2ª tentativa) |
| RNF-04 | Manter os totais de testes atuais (154 Cadastro, 11 Identificacao, ~140 Arrecadacao, ~80 Distribuicao, 15 BFF, 51 frontend) e adicionar novos |
| RNF-05 | Testes em PT-BR só nos `describe`/`it` quando o time já segue convenção; preservar nomenclatura existente |
| RNF-06 | Backend é a fonte da decisão — testes não devem usar mocks que escondam o caminho real `RequirePermission → AuthzDecisionClient → ecad-authz` |

## 7. Cenários Críticos (resumo da Tabela de Casos de Teste)

Detalhes completos em `techspec.md §3` — referem ao plano aprovado em `/home/tsgomes/.claude/plans/analise-o-projeto-ecad-authz-delightful-dahl.md`.

| ID | Tipo | Resumo |
|----|------|--------|
| CT-CAD-R01..07 | integration .NET | regressão Cadastro |
| CT-IDF-R01..07 | integration .NET | regressão Identificacao |
| CT-ARR-R01..07 | integration Java | regressão Arrecadacao (com Testcontainers ampliado) |
| CT-DIS-R01..05 | integration Java | regressão Distribuicao |
| CT-BFF-R01..05 | integration Node | regressão BFF |
| CT-FE-G1-*, G2-*, G3-* | unit Vitest | refactor ProcessoCalculoPage + sidebar |
| CT-E2E-01..10 | e2e Playwright | suite ponta-a-ponta |
| CT-A11Y-01..04 | a11y Playwright + axe | baseline |

## 8. Aceite

- [ ] Todos os comandos da seção "Verificação" do plano aprovado retornam verde
- [ ] `grep -rn "hasRole" mcad/frontend/src` mostra **apenas** as ocorrências em arquivos de teste e em arquivos legacy explicitamente justificados
- [ ] `pnpm e2e` executa 10 cenários em ≤ 5 min com 0 falhas
- [ ] Checklist da Tarefa 20 do PRD original atualizado em `docs/migracao-authz/prd.md` (3 itens novos a marcar)
- [ ] `docs/migracao-authz/relatorio-final.md` ganha uma nota de "validação E2E concluída"

## 9. Referências

- `docs/migracao-authz/prd.md` — PRD original (1327 linhas, 20 tasks)
- `docs/migracao-authz/relatorio-final.md` — estado em 2026-05-15
- `docs/migracao-authz/proximos-passos.md` — pendências da migração
- `docs/migracao-authz/analise-estado-atual.md` — análise consolidada
- `docs/adr/0001..0005-*.md` — decisões arquiteturais
- `/home/tsgomes/.claude/plans/analise-o-projeto-ecad-authz-delightful-dahl.md` — plano aprovado nesta sessão (fonte canônica desta matriz de testes)
- `ecad-authz/tooling/e2e/tests/` — 8 specs canônicas da plataforma authz (modelo)
