CREATE TABLE arrecadacao.licencas (
    id                UUID        PRIMARY KEY,
    usuario_musica_id UUID        NOT NULL REFERENCES arrecadacao.usuarios_musica(id),
    rubrica_id        UUID        NOT NULL REFERENCES arrecadacao.rubricas(id),
    data_inicio       DATE        NOT NULL,
    data_fim          DATE,
    status            VARCHAR(15) NOT NULL DEFAULT 'ATIVA',
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_licencas_status CHECK (status IN ('ATIVA', 'SUSPENSA', 'ENCERRADA'))
);

CREATE INDEX ix_licencas_usuario_musica_id ON arrecadacao.licencas (usuario_musica_id);
CREATE INDEX ix_licencas_rubrica_id ON arrecadacao.licencas (rubrica_id);
CREATE INDEX ix_licencas_status ON arrecadacao.licencas (status);
CREATE INDEX ix_licencas_data_inicio ON arrecadacao.licencas (data_inicio DESC);
CREATE INDEX ix_licencas_vigente ON arrecadacao.licencas (data_fim)
    WHERE data_fim IS NOT NULL;
