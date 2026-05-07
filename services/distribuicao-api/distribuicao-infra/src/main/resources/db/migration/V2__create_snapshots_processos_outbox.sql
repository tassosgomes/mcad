-- Snapshots de Rol (Identificação)
CREATE TABLE distribuicao.snapshots_rol (
    id               UUID         PRIMARY KEY,
    rubrica_sigla    VARCHAR(20)  NOT NULL,
    periodo          VARCHAR(7)   NOT NULL,
    captacao_id      UUID,
    total_execucoes  INTEGER      NOT NULL DEFAULT 0,
    payload          TEXT,
    cancelado        BOOLEAN      NOT NULL DEFAULT FALSE,
    recebido_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (rubrica_sigla, periodo, captacao_id)
);

-- Snapshots de Verba (Arrecadação)
CREATE TABLE distribuicao.snapshots_verba (
    id                    UUID           PRIMARY KEY,
    rubrica_sigla         VARCHAR(20)    NOT NULL,
    periodo               VARCHAR(7)     NOT NULL,
    valor_bruto           DECIMAL(15,2),
    deducao_ecad          DECIMAL(15,2),
    deducao_associacoes   DECIMAL(15,2),
    verba_liquida         DECIMAL(15,2)  NOT NULL,
    recebido_em           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (rubrica_sigla, periodo)
);

-- Processos de Distribuição
CREATE TABLE distribuicao.processos (
    id                          UUID           PRIMARY KEY,
    rubrica_sigla               VARCHAR(20)    NOT NULL,
    periodo                     VARCHAR(7)     NOT NULL,
    status                      VARCHAR(20)    NOT NULL DEFAULT 'CRIADO',
    verba_liquida               DECIMAL(15,2)  NOT NULL,
    total_execucoes             INTEGER,
    analista_responsavel        VARCHAR(200)   NOT NULL,
    snapshot_rol_id             UUID           REFERENCES distribuicao.snapshots_rol(id),
    snapshot_verba_id           UUID           REFERENCES distribuicao.snapshots_verba(id),
    criado_em                   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    calculado_em                TIMESTAMPTZ,
    aprovado_em                 TIMESTAMPTZ,
    finalizado_em               TIMESTAMPTZ,
    cancelado_em                TIMESTAMPTZ,
    justificativa_cancelamento  VARCHAR(500),
    CONSTRAINT uq_processo_ativo EXCLUDE USING btree (rubrica_sigla WITH =, periodo WITH =)
        WHERE (status != 'CANCELADO')
);

CREATE INDEX ix_processos_rubrica_periodo ON distribuicao.processos (rubrica_sigla, periodo);
CREATE INDEX ix_processos_status ON distribuicao.processos (status);

-- Outbox Events
CREATE TABLE distribuicao.outbox_events (
    id            UUID         PRIMARY KEY,
    type          VARCHAR(100) NOT NULL,
    routing_key   VARCHAR(100) NOT NULL,
    subject       VARCHAR(255),
    payload       TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at  TIMESTAMPTZ,
    attempts      INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX ix_outbox_events_pending
    ON distribuicao.outbox_events (created_at)
    WHERE published_at IS NULL AND attempts < 10;
