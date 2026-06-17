ALTER TABLE arrecadacao.pagamento
    DROP CONSTRAINT IF EXISTS chk_pagamento_status;

ALTER TABLE arrecadacao.pagamento
    ADD CONSTRAINT chk_pagamento_status
        CHECK (status IN ('BOLETO_EMITIDO', 'CONFIRMADO', 'ESTORNADO'));

ALTER TABLE arrecadacao.pagamento
    ADD COLUMN IF NOT EXISTS boleto_nosso_numero VARCHAR(32),
    ADD COLUMN IF NOT EXISTS boleto_linha_digitavel VARCHAR(64),
    ADD COLUMN IF NOT EXISTS boleto_codigo_barras VARCHAR(44),
    ADD COLUMN IF NOT EXISTS boleto_vencimento DATE,
    ADD COLUMN IF NOT EXISTS boleto_storage_file_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS boleto_storage_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS boleto_emitido_em TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pagamento_licenca_periodo_boleto_emitido
    ON arrecadacao.pagamento (licenca_id, periodo)
    WHERE status = 'BOLETO_EMITIDO';

CREATE INDEX IF NOT EXISTS ix_pagamento_boleto_storage_file_id
    ON arrecadacao.pagamento (boleto_storage_file_id);
