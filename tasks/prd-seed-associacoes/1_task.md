---
status: done
parallelizable: true
blocked_by: []
---

<task_context>
<domain>infra/database</domain>
<type>configuration</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0, 4.0"</unblocks>
</task_context>

# Tarefa 1.0: Scripts SQL — Database, Schema, Usuário e Grants

## Relacionada às User Stories

- [HU-02] Associações disponíveis no startup (suporte — infraestrutura de banco)

## Visão Geral

Criar os scripts SQL para preparar o PostgreSQL para o domínio Cadastro: database `mcad`, schema isolado `cadastro`, usuário dedicado `cadastro_svc` com grants restritos (Schema-per-Service).

## Requisitos

- Database `mcad` com encoding UTF-8
- Schema `cadastro` isolado
- Usuário `cadastro_svc` com acesso restrito ao schema `cadastro`
- Sem acesso cross-schema (revoke em `public`)
- Scripts idempotentes (IF NOT EXISTS)

## Arquivos Envolvidos

- **Criar:**
  - `scripts/00-create-database.sql`
  - `scripts/01-setup-cadastro-schema.sql`
- **Referência:**
  - `tasks/prd-seed-associacoes/techspec.md` (seção "Scripts de Banco de Dados")

## Subtarefas

- [ ] 1.1 Criar `scripts/00-create-database.sql` — CREATE DATABASE mcad com encoding UTF-8
- [ ] 1.2 Criar `scripts/01-setup-cadastro-schema.sql` — CREATE SCHEMA, CREATE ROLE, GRANT/REVOKE
- [ ] 1.3 Testar execução dos scripts em PostgreSQL local

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0 (precisa do banco para connection string), 4.0 (migrations)
- Paralelizável: Sim — pode executar em paralelo com 8.0 (frontend setup)

## Detalhes de Implementação

### Script 00 — Criação do Database

```sql
CREATE DATABASE mcad
    WITH ENCODING = 'UTF8'
         LC_COLLATE = 'pt_BR.UTF-8'
         LC_CTYPE = 'pt_BR.UTF-8';
```

> Fallback para `en_US.UTF-8` se `pt_BR` não estiver disponível.

### Script 01 — Schema, Usuário e Grants

```sql
CREATE SCHEMA IF NOT EXISTS cadastro;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cadastro_svc') THEN
        CREATE ROLE cadastro_svc WITH LOGIN PASSWORD 'CHANGE_ME';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA cadastro TO cadastro_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cadastro TO cadastro_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cadastro_svc;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA cadastro TO cadastro_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro
    GRANT USAGE, SELECT ON SEQUENCES TO cadastro_svc;

REVOKE ALL ON SCHEMA public FROM cadastro_svc;
```

## Critérios de Sucesso (Verificáveis)

- [ ] Script 00 executa sem erros em PostgreSQL 16
- [ ] Script 01 executa sem erros quando conectado ao database `mcad`
- [ ] Usuário `cadastro_svc` consegue criar tabelas no schema `cadastro`
- [ ] Usuário `cadastro_svc` NÃO consegue acessar schema `public`
- [ ] Scripts são idempotentes — executar duas vezes não gera erros
