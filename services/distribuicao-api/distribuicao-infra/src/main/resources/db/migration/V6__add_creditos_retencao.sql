ALTER TABLE distribuicao.creditos
    ADD COLUMN motivo_retencao VARCHAR(40),
    ADD COLUMN retido_em TIMESTAMPTZ;

ALTER TABLE distribuicao.creditos
    ADD CONSTRAINT ck_creditos_retencao_status
    CHECK (
        (status = 'RETIDO' AND motivo_retencao IS NOT NULL AND retido_em IS NOT NULL)
        OR
        (status <> 'RETIDO' AND motivo_retencao IS NULL AND retido_em IS NULL)
    );

ALTER TABLE distribuicao.creditos
    ADD CONSTRAINT ck_creditos_motivo_retencao
    CHECK (
        motivo_retencao IS NULL
        OR motivo_retencao IN ('OBRA_PENDENTE', 'OBRA_BLOQUEADA', 'TITULAR_SEM_ASSOCIACAO')
    );

ALTER TABLE distribuicao.processos
    ADD COLUMN total_creditos_retidos INTEGER,
    ADD COLUMN valor_total_retido DECIMAL(15,2);

CREATE INDEX ix_creditos_processo_status
    ON distribuicao.creditos (processo_id, status);

CREATE INDEX ix_creditos_processo_motivo_retencao
    ON distribuicao.creditos (processo_id, motivo_retencao)
    WHERE motivo_retencao IS NOT NULL;
