CREATE TABLE IF NOT EXISTS distribuicao.rubricas (
    id UUID PRIMARY KEY,
    sigla VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    exige_classificacao BOOLEAN NOT NULL DEFAULT FALSE,
    sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_distribuicao_rubricas_sigla UNIQUE (sigla)
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_distribuicao_rubricas_sigla
    ON distribuicao.rubricas (sigla);
