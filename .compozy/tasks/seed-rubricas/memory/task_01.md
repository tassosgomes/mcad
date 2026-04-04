# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Criar a base de infraestrutura para o domínio Arrecadação com schema PostgreSQL isolado, role dedicada e referência do serviço Java no docker compose.
- Sinal pré-mudança: `scripts/postgres-init/01-create-schemas.sql` só cria `keycloak`, e `docker-compose.dev.yml` não cita `arrecadacao-api`.

## Important Decisions
- Seguir o SQL exato da seção "Scripts de Banco de Dados" do `_techspec.md`.
- Criar um arquivo separado `scripts/postgres-init/02-setup-arrecadacao-schema.sql` para manter o bootstrap existente de `keycloak` intocado.
- Tornar a senha da role configurável com `\\getenv ARRECADACAO_DB_PASSWORD`, mantendo fallback para `CHANGE_ME` no bootstrap local.
- Tratar `cadastro` e `identificacao` com `DO` condicional para que a primeira inicialização não quebre se esses schemas ainda não existirem.

## Learnings
- `AGENTS.md`, `CLAUDE.md` e arquivos em `adrs/` não existem nos caminhos pesquisados no repositório atual.
- O schema `public` continua acessível via role implícita `PUBLIC` mesmo após `REVOKE ... FROM arrecadacao_svc`; foi necessário revogar de `PUBLIC` também.

## Files / Surfaces
- `scripts/postgres-init/01-create-schemas.sql`
- `scripts/postgres-init/02-setup-arrecadacao-schema.sql`
- `docker-compose.dev.yml`

## Errors / Corrections
- O caminho inicial da skill `cy-workflow-memory` fora do repositório estava incorreto; a skill correta está em `.agents/skills/cy-workflow-memory/SKILL.md`.
- A primeira versão do script falhou no init porque `psql` não substitui `:'variavel'` dentro do `DO $$` como esperado; a criação da role foi corrigida para `SELECT ... \\gexec`.

## Ready for Next Run
- Validação executada com `docker compose down -v`, `docker compose up -d mcad-postgres`, reexecução manual do script e testes de acesso via `psql` como `arrecadacao_svc`.
- Evidências principais: schema `arrecadacao` e role `arrecadacao_svc` existem; `SELECT` em `arrecadacao.probe` funciona; `SELECT` em `cadastro.probe` e `public.probe` falha com `permission denied`.
