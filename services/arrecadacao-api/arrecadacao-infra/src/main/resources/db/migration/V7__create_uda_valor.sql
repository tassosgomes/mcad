CREATE TABLE arrecadacao.uda_valor (
    id            UUID          PRIMARY KEY,
    valor         NUMERIC(18,6) NOT NULL CHECK (valor > 0),
    data_vigencia DATE          NOT NULL,
    criado_em     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    criado_por    VARCHAR(200)
);

CREATE INDEX ix_uda_valor_vigencia
    ON arrecadacao.uda_valor (data_vigencia DESC);

-- Seed: valor inicial R$ 107,31 com dataVigencia 2026-01-01 e criadoPor NULL
INSERT INTO arrecadacao.uda_valor (id, valor, data_vigencia, criado_em, criado_por)
VALUES ('d1e2f3a4-b5c6-7890-abcd-111111111111', 107.310000, '2026-01-01', NOW(), NULL)
ON CONFLICT DO NOTHING;
