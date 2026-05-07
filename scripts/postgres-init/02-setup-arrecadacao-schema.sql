-- Executar conectado ao database mcad como superuser
-- Permite sobrescrever a senha via variável de ambiente do processo psql.
\getenv arrecadacao_svc_password ARRECADACAO_DB_PASSWORD
\if :{?arrecadacao_svc_password}
\else
\set arrecadacao_svc_password 'CHANGE_ME'
\endif

-- 1. Criar schema isolado para o domínio Arrecadação
CREATE SCHEMA IF NOT EXISTS arrecadacao;

-- 2. Criar usuário dedicado ao serviço
SELECT format(
    'CREATE ROLE arrecadacao_svc WITH LOGIN PASSWORD %L',
    :'arrecadacao_svc_password'
)
WHERE NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = 'arrecadacao_svc'
)
\gexec

-- 3. Grants — acesso restrito ao schema arrecadacao
GRANT USAGE, CREATE ON SCHEMA arrecadacao TO arrecadacao_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA arrecadacao TO arrecadacao_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA arrecadacao
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arrecadacao_svc;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA arrecadacao TO arrecadacao_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA arrecadacao
    GRANT USAGE, SELECT ON SEQUENCES TO arrecadacao_svc;

-- 4. Revogar acesso a outros schemas
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM arrecadacao_svc;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'cadastro') THEN
        REVOKE ALL ON SCHEMA cadastro FROM arrecadacao_svc;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'identificacao') THEN
        REVOKE ALL ON SCHEMA identificacao FROM arrecadacao_svc;
    END IF;
END
$$;
