-- Base schemas and service users for the MCAD stack.
-- Passwords can be supplied through the postgres container environment.

\getenv cadastro_svc_password CADASTRO_DB_PASSWORD
\if :{?cadastro_svc_password}
\else
\set cadastro_svc_password 'CHANGE_ME'
\endif

\getenv identificacao_svc_password IDENTIFICACAO_DB_PASSWORD
\if :{?identificacao_svc_password}
\else
\set identificacao_svc_password 'CHANGE_ME'
\endif

CREATE SCHEMA IF NOT EXISTS cadastro;
CREATE SCHEMA IF NOT EXISTS identificacao;

SELECT format(
    'CREATE ROLE cadastro_svc WITH LOGIN PASSWORD %L',
    :'cadastro_svc_password'
)
WHERE NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cadastro_svc'
)
\gexec

SELECT format(
    'CREATE ROLE identificacao_svc WITH LOGIN PASSWORD %L',
    :'identificacao_svc_password'
)
WHERE NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = 'identificacao_svc'
)
\gexec

GRANT USAGE, CREATE ON SCHEMA cadastro TO cadastro_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cadastro TO cadastro_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cadastro_svc;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA cadastro TO cadastro_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro
    GRANT USAGE, SELECT ON SEQUENCES TO cadastro_svc;

GRANT USAGE, CREATE ON SCHEMA identificacao TO identificacao_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identificacao TO identificacao_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA identificacao
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO identificacao_svc;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identificacao TO identificacao_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA identificacao
    GRANT USAGE, SELECT ON SEQUENCES TO identificacao_svc;
