-- scripts/00-create-database.sql
-- Executar como superuser no PostgreSQL antes do primeiro deploy
-- Cria o database 'mcad' que será compartilhado por todos os domínios (Schema-per-Service)
-- Uso: psql -h HOST -U superuser -d postgres -f 00-create-database.sql

-- CREATE DATABASE não pode ser executado dentro de DO/transação.
-- Usamos \gexec para executar SQL gerado dinamicamente pelo psql.
SELECT 'CREATE DATABASE mcad'
       || ' WITH ENCODING = ''UTF8'''
       || '      LC_COLLATE = ''pt_BR.UTF-8'''
       || '      LC_CTYPE   = ''pt_BR.UTF-8'''
       || '      TEMPLATE   = template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mcad')
\gexec
