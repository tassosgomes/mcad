CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;

CREATE TABLE arrecadacao.usuarios_musica (
    id                UUID         PRIMARY KEY,
    razao_social      VARCHAR(200) NOT NULL,
    nome_fantasia     VARCHAR(200),
    cnpj              VARCHAR(14)  NOT NULL UNIQUE,
    cep               VARCHAR(8)   NOT NULL,
    logradouro        VARCHAR(200) NOT NULL,
    numero            VARCHAR(20)  NOT NULL,
    complemento       VARCHAR(100),
    bairro            VARCHAR(100) NOT NULL,
    cidade            VARCHAR(100) NOT NULL,
    uf                VARCHAR(2)   NOT NULL,
    nome_responsavel  VARCHAR(200) NOT NULL,
    telefone          VARCHAR(20),
    email             VARCHAR(200),
    status            VARCHAR(10)  NOT NULL DEFAULT 'ATIVO',
    criado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usuarios_musica_status CHECK (status IN ('ATIVO', 'INATIVO'))
);

CREATE INDEX ix_usuarios_musica_razao_social
    ON arrecadacao.usuarios_musica USING gin (razao_social gin_trgm_ops);
CREATE INDEX ix_usuarios_musica_cnpj
    ON arrecadacao.usuarios_musica (cnpj);
CREATE INDEX ix_usuarios_musica_cidade
    ON arrecadacao.usuarios_musica USING gin (cidade gin_trgm_ops);
CREATE INDEX ix_usuarios_musica_status
    ON arrecadacao.usuarios_musica (status);
