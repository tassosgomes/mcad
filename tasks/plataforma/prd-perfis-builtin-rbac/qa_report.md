# QA Report — Catálogo de Perfis Built-in RBAC

- **Data:** 2026-05-26
- **Branch:** worktree local
- **Stack:** JSON seeds + Bash, .NET 8, Java/Spring Boot, Fastify/TypeScript, React/Vite
- **Skills/regras usadas:** sequential-mission, cy-final-verify, roles-naming, restful-api, dotnet/react/java testing e architecture conforme escopo

## Status por tarefa

| Task | Status | Evidência |
|---|---|---|
| 0.0 JWT Distribuição → Cadastro | Concluída | `investigation-jwt-propagation.md`; TechSpec marcada como resolvida. |
| 1.0 Seeds + re-seed DEV | Bloqueada parcialmente | JSON válido e dry-run OK; aplicação real bloqueada por `AUTHZ_ADMIN_TOKEN` ausente. |
| 2.0 Mascaramento CPF Cadastro | Concluída | `dotnet build`, unit tests e integration tests de mascaramento passaram. |
| 3.0 Matriz authz Distribuição | Bloqueada na validação | Teste implementado; Maven bloqueado por `audit-sdk-core:1.0.0` no GitHub Packages com 401. |
| 4.0 BFF Acessos | Concluída | `services/bff` build e test passaram. |
| 5.0 BFF Histórico | Concluída | `services/bff` build e test passaram. |
| 6.0 Frontend Acessos | Concluída | `frontend` test e build passaram. |
| 7.0 Frontend Histórico/gating | Concluída | `frontend` test e build passaram. |
| 8.0 Documentação | Concluída | ADR README e relatório final atualizados; ADRs 0006-0009 estão `Accepted`. |

## Verificação executada

| Comando | Resultado |
|---|---|
| `jq empty seeds/mcad/*.json` | PASS |
| `./scripts/seed-authz.sh --dry-run` | PASS; inclui catálogo `acessos`, Distribuição 19 permissões, Cadastro 42 permissões, 12 papéis e usuários de teste. |
| `./scripts/seed-authz.sh` | FAIL esperado; `AUTHZ_ADMIN_TOKEN` ausente. |
| `dotnet build services/cadastro-api/Cadastro.sln` | PASS; 0 erros, 1 warning xUnit pré-existente. |
| `dotnet test services/cadastro-api/5-Tests/Cadastro.UnitTests/Cadastro.UnitTests.csproj --no-build` | PASS; 158/158. |
| `dotnet test services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Cadastro.IntegrationTests.csproj --no-build --filter TitularCpfMaskingTests` | PASS; 4/4. |
| `npm test` em `services/bff` | PASS; 4 arquivos JS de teste executados pelo `node --test`, 0 falhas. |
| `npm run build` em `services/bff` | PASS; `tsc -p tsconfig.json`. |
| `npm test` em `frontend` | PASS; 20 arquivos, 78 testes. |
| `npm run build` em `frontend` | PASS; `tsc -b && vite build`; aviso existente de `/runtime-env.js`. |
| `mvn -pl distribuicao-tests -am -Dtest=AuthzPermissionEnforcementTest -Dsurefire.failIfNoSpecifiedTests=false test` em `services/distribuicao-api` | FAIL bloqueante; GitHub Packages retorna 401 para `br.org.ecad.audit:audit-sdk-core:1.0.0`. |

## Observações e tradeoffs

- A Task 1.0 possui inconsistência documental: alguns trechos falam em 9 novas permissões de Distribuição, mas o inventário detalhado lista 10. A implementação seguiu o inventário detalhado do PRD/TechSpec.
- A aplicação real do seed não foi executada sem token admin. O dry-run prova estrutura e chamadas, mas não prova estado do ambiente DEV.
- A matriz Java foi implementada, mas a suíte não chegou aos testes por falha de resolução de dependência privada antes do módulo `distribuicao-tests`.
- Não foram adicionadas specs Playwright porque não há tooling E2E local em `tooling/`.
