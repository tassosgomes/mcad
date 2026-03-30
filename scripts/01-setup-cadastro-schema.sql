-- scripts/01-setup-cadastro-schema.sql
-- Executar conectado ao database 'mcad' como superuser
-- Configura schema isolado, usuário dedicado e grants para o domínio Cadastro (Schema-per-Service)

-- 1. Criar schema isolado para o domínio Cadastro
CREATE SCHEMA IF NOT EXISTS cadastro;

-- 2. Criar usuário dedicado ao serviço (idempotente via DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cadastro_svc') THEN
        CREATE ROLE cadastro_svc WITH LOGIN PASSWORD 'CHANGE_ME';
    END IF;
END
$$;

-- 3. Grants — acesso restrito ao schema cadastro
GRANT USAGE ON SCHEMA cadastro TO cadastro_svc;

-- Tabelas existentes
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cadastro TO cadastro_svc;

-- Novas tabelas (padrão para futuras migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cadastro_svc;

-- Sequences existentes
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA cadastro TO cadastro_svc;

-- Novas sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro
    GRANT USAGE, SELECT ON SEQUENCES TO cadastro_svc;

-- 4. Revogar acesso ao schema public (isolamento cross-schema)
REVOKE ALL ON SCHEMA public FROM cadastro_svc;

-- Verificação (executar após o script para confirmar):
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'cadastro';
-- SELECT rolname FROM pg_roles WHERE rolname = 'cadastro_svc';
