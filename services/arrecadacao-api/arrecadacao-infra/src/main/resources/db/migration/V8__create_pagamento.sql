CREATE TABLE arrecadacao.pagamento (
    id                    UUID          PRIMARY KEY,
    licenca_id            UUID          NOT NULL REFERENCES arrecadacao.licencas(id),
    quantidade_udas       NUMERIC(18,6) NOT NULL CHECK (quantidade_udas > 0),
    valor_uda_no_momento  NUMERIC(18,6) NOT NULL,
    valor_bruto           NUMERIC(18,6) NOT NULL,
    periodo               CHAR(7)       NOT NULL,
    status                VARCHAR(20)   NOT NULL DEFAULT 'CONFIRMADO',
    data_registro         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    criado_em             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pagamento_status CHECK (status IN ('CONFIRMADO', 'ESTORNADO'))
);

-- Unicidade: apenas 1 pagamento CONFIRMADO por licenca+periodo
CREATE UNIQUE INDEX uq_pagamento_licenca_periodo_confirmado
    ON arrecadacao.pagamento (licenca_id, periodo)
    WHERE status = 'CONFIRMADO';

CREATE INDEX ix_pagamento_licenca_id ON arrecadacao.pagamento (licenca_id);
CREATE INDEX ix_pagamento_periodo ON arrecadacao.pagamento (periodo);
CREATE INDEX ix_pagamento_status ON arrecadacao.pagamento (status);
CREATE INDEX ix_pagamento_data_registro ON arrecadacao.pagamento (data_registro DESC);
