ALTER TABLE distribuicao.creditos
    ADD COLUMN liberado_em TIMESTAMPTZ,
    ADD COLUMN processo_liberacao_id UUID REFERENCES distribuicao.processos(id);

ALTER TABLE distribuicao.creditos
    DROP CONSTRAINT ck_creditos_retencao_status;

ALTER TABLE distribuicao.creditos
    ADD CONSTRAINT ck_creditos_lifecycle_status
    CHECK (
        (
            status = 'CALCULADO'
            AND motivo_retencao IS NULL
            AND retido_em IS NULL
            AND liberado_em IS NULL
            AND processo_liberacao_id IS NULL
        )
        OR
        (
            status = 'RETIDO'
            AND motivo_retencao IS NOT NULL
            AND retido_em IS NOT NULL
            AND liberado_em IS NULL
            AND processo_liberacao_id IS NULL
        )
        OR
        (
            status = 'LIBERADO'
            AND motivo_retencao IS NOT NULL
            AND retido_em IS NOT NULL
            AND liberado_em IS NOT NULL
            AND processo_liberacao_id IS NOT NULL
        )
    );

ALTER TABLE distribuicao.processos
    ADD COLUMN total_creditos_retidos_liberados INTEGER,
    ADD COLUMN valor_total_retidos_liberados DECIMAL(15,2);

CREATE TABLE distribuicao.credito_liberacoes (
    id                         UUID          PRIMARY KEY,
    credito_retido_id          UUID          NOT NULL REFERENCES distribuicao.creditos(id),
    processo_origem_id         UUID          NOT NULL REFERENCES distribuicao.processos(id),
    processo_liberacao_id      UUID          NOT NULL REFERENCES distribuicao.processos(id),
    status                     VARCHAR(20)   NOT NULL,
    valor_liberado             DECIMAL(15,2) NOT NULL,
    motivo_retencao_original   VARCHAR(40)   NOT NULL,
    avaliado_em                TIMESTAMPTZ   NOT NULL,
    efetivado_em               TIMESTAMPTZ,
    cancelado_em               TIMESTAMPTZ,
    CONSTRAINT ck_credito_liberacoes_status
        CHECK (status IN ('PREVISTA', 'EFETIVADA', 'CANCELADA')),
    CONSTRAINT ck_credito_liberacoes_datas
        CHECK (
            (status = 'PREVISTA' AND efetivado_em IS NULL AND cancelado_em IS NULL)
            OR (status = 'EFETIVADA' AND efetivado_em IS NOT NULL AND cancelado_em IS NULL)
            OR (status = 'CANCELADA' AND efetivado_em IS NULL AND cancelado_em IS NOT NULL)
        )
);

CREATE UNIQUE INDEX ux_credito_liberacoes_credito_nao_cancelada
    ON distribuicao.credito_liberacoes (credito_retido_id)
    WHERE status IN ('PREVISTA', 'EFETIVADA');

CREATE INDEX ix_credito_liberacoes_processo_liberacao
    ON distribuicao.credito_liberacoes (processo_liberacao_id, status);

CREATE INDEX ix_creditos_liberacao
    ON distribuicao.creditos (processo_liberacao_id, status)
    WHERE processo_liberacao_id IS NOT NULL;

CREATE TABLE distribuicao.credito_retido_reavaliacoes (
    id                       UUID          PRIMARY KEY,
    credito_retido_id        UUID          NOT NULL REFERENCES distribuicao.creditos(id),
    processo_reavaliacao_id  UUID          NOT NULL REFERENCES distribuicao.processos(id),
    resultado                VARCHAR(40)   NOT NULL,
    detalhe                  VARCHAR(500),
    avaliado_em              TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_credito_retido_reavaliacoes_resultado
        CHECK (resultado IN (
            'ELEGIVEL',
            'OBRA_PENDENTE',
            'OBRA_BLOQUEADA',
            'TITULAR_SEM_ASSOCIACAO',
            'OBRA_NAO_DISTRIBUIVEL',
            'PARTICIPACAO_NAO_ENCONTRADA'
        ))
);

CREATE INDEX ix_credito_reavaliacoes_credito
    ON distribuicao.credito_retido_reavaliacoes (credito_retido_id, avaliado_em DESC);
