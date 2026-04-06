CREATE TABLE arrecadacao.historico_status_usuario (
    id                 UUID         PRIMARY KEY,
    usuario_musica_id  UUID         NOT NULL REFERENCES arrecadacao.usuarios_musica(id),
    status_anterior    VARCHAR(10),
    status_novo        VARCHAR(10)  NOT NULL,
    justificativa      VARCHAR(500) NOT NULL,
    autor              VARCHAR(100) NOT NULL,
    data               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_hist_status_anterior CHECK (status_anterior IS NULL OR status_anterior IN ('ATIVO', 'INATIVO')),
    CONSTRAINT chk_hist_status_novo CHECK (status_novo IN ('ATIVO', 'INATIVO'))
);

CREATE INDEX ix_historico_status_usuario_fk
    ON arrecadacao.historico_status_usuario (usuario_musica_id, data DESC);
