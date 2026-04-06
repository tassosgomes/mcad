CREATE TABLE arrecadacao.historico_status_licenca (
    id              UUID         PRIMARY KEY,
    licenca_id      UUID         NOT NULL REFERENCES arrecadacao.licencas(id),
    status_anterior VARCHAR(15),
    status_novo     VARCHAR(15)  NOT NULL,
    justificativa   VARCHAR(500) NOT NULL,
    autor           VARCHAR(100) NOT NULL,
    data            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_hist_licenca_anterior CHECK (status_anterior IS NULL OR status_anterior IN ('ATIVA', 'SUSPENSA', 'ENCERRADA')),
    CONSTRAINT chk_hist_licenca_novo CHECK (status_novo IN ('ATIVA', 'SUSPENSA', 'ENCERRADA'))
);

CREATE INDEX ix_historico_status_licenca_fk
    ON arrecadacao.historico_status_licenca (licenca_id, data DESC);
