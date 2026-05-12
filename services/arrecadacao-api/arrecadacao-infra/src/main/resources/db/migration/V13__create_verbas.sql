-- F05: Tabela de verbas por rubrica×período
-- Agregado materializado que acumula pagamentos CONFIRMADOS, aplica deduções e mantém a verba líquida.
-- DECIMAL(15,2) alinhado com distribuicao.snapshots_verba (D04).
CREATE TABLE arrecadacao.verbas (
    id                      UUID           PRIMARY KEY,
    rubrica_id              UUID           NOT NULL REFERENCES arrecadacao.rubricas(id),
    periodo                 VARCHAR(7)     NOT NULL,
    valor_bruto_total       DECIMAL(15,2)  NOT NULL DEFAULT 0,
    deducao_ecad            DECIMAL(15,2)  NOT NULL DEFAULT 0,
    deducao_associacoes     DECIMAL(15,2)  NOT NULL DEFAULT 0,
    verba_liquida           DECIMAL(15,2)  NOT NULL DEFAULT 0,
    quantidade_pagamentos   INTEGER        NOT NULL DEFAULT 0,
    status                  VARCHAR(20)    NOT NULL DEFAULT 'ABERTA',
    criado_em               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_verbas_rubrica_periodo UNIQUE (rubrica_id, periodo)
);

CREATE INDEX ix_verbas_periodo ON arrecadacao.verbas (periodo);
CREATE INDEX ix_verbas_status  ON arrecadacao.verbas (status);
