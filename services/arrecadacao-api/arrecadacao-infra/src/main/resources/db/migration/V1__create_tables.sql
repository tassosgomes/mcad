CREATE TABLE arrecadacao.rubricas (
    id UUID PRIMARY KEY,
    sigla VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    exige_classificacao BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_rubricas_sigla UNIQUE (sigla)
);

CREATE TABLE arrecadacao.outbox_events (
    id UUID PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    routing_key VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NULL,
    attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX ix_outbox_events_pending
    ON arrecadacao.outbox_events (created_at)
    WHERE published_at IS NULL AND attempts < 10;
