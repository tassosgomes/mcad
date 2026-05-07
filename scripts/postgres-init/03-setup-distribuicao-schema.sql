-- Executar conectado ao database mcad como superuser
\getenv distribuicao_app_password DB_PASSWORD_DISTRIBUICAO
\if :{?distribuicao_app_password}
\else
\set distribuicao_app_password 'distribuicao_app'
\endif

CREATE SCHEMA IF NOT EXISTS distribuicao;

SELECT format(
    'CREATE ROLE distribuicao_app WITH LOGIN PASSWORD %L',
    :'distribuicao_app_password'
)
WHERE NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = 'distribuicao_app'
)
\gexec

GRANT USAGE, CREATE ON SCHEMA distribuicao TO distribuicao_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA distribuicao TO distribuicao_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA distribuicao
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO distribuicao_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA distribuicao TO distribuicao_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA distribuicao
    GRANT USAGE, SELECT ON SEQUENCES TO distribuicao_app;

REVOKE ALL ON SCHEMA public FROM distribuicao_app;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'cadastro') THEN
        REVOKE ALL ON SCHEMA cadastro FROM distribuicao_app;
    END IF;
    IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'identificacao') THEN
        REVOKE ALL ON SCHEMA identificacao FROM distribuicao_app;
    END IF;
    IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'arrecadacao') THEN
        REVOKE ALL ON SCHEMA arrecadacao FROM distribuicao_app;
    END IF;
END
$$;
