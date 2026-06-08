ALTER TABLE distribuicao.processos
    ADD COLUMN total_ajustes_estorno INTEGER,
    ADD COLUMN valor_total_ajustes_estorno DECIMAL(15,2);

CREATE TABLE distribuicao.ajustes_estorno (
    id                         UUID          PRIMARY KEY,
    event_id                   UUID          NOT NULL,
    pagamento_id               UUID          NOT NULL,
    licenca_id                 UUID          NOT NULL,
    rubrica_sigla              VARCHAR(20)   NOT NULL,
    periodo_origem             VARCHAR(7)    NOT NULL,
    quantidade_udas            DECIMAL(18,6) NOT NULL,
    valor_estornado_bruto      DECIMAL(15,2) NOT NULL,
    valor_ajuste_liquido       DECIMAL(15,2) NOT NULL,
    valor_aplicado             DECIMAL(15,2),
    justificativa              VARCHAR(1000) NOT NULL,
    estornado_por              VARCHAR(200)  NOT NULL,
    estornado_em               TIMESTAMPTZ   NOT NULL,
    status                     VARCHAR(40)   NOT NULL,
    processo_origem_id         UUID REFERENCES distribuicao.processos(id),
    processo_aplicacao_id      UUID REFERENCES distribuicao.processos(id),
    payload_original           TEXT          NOT NULL,
    recebido_em                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    previsto_em                TIMESTAMPTZ,
    aplicado_em                TIMESTAMPTZ,
    erro_integridade           VARCHAR(500),
    CONSTRAINT ux_ajustes_estorno_event_id UNIQUE (event_id),
    CONSTRAINT ux_ajustes_estorno_pagamento_id UNIQUE (pagamento_id),
    CONSTRAINT ck_ajustes_estorno_status CHECK (status IN (
        'PENDENTE_APLICACAO',
        'PREVISTO',
        'APLICADO',
        'CANCELADO',
        'IGNORADO_SEM_DISTRIBUICAO',
        'PROCESSO_CRIADO_DESATUALIZADO',
        'ERRO_INTEGRIDADE'
    )),
    CONSTRAINT ck_ajustes_estorno_valores CHECK (
        valor_estornado_bruto >= 0
        AND valor_ajuste_liquido >= 0
        AND (valor_aplicado IS NULL OR valor_aplicado <= 0)
    ),
    CONSTRAINT ck_ajustes_estorno_datas CHECK (
        (status = 'PREVISTO' AND processo_aplicacao_id IS NOT NULL AND previsto_em IS NOT NULL)
        OR (status = 'APLICADO' AND processo_aplicacao_id IS NOT NULL AND previsto_em IS NOT NULL AND aplicado_em IS NOT NULL)
        OR (status NOT IN ('PREVISTO', 'APLICADO'))
    )
);

CREATE INDEX ix_ajustes_estorno_listagem
    ON distribuicao.ajustes_estorno (status, rubrica_sigla, periodo_origem, estornado_em DESC);

CREATE INDEX ix_ajustes_estorno_aplicacao
    ON distribuicao.ajustes_estorno (processo_aplicacao_id, status)
    WHERE processo_aplicacao_id IS NOT NULL;

CREATE INDEX ix_ajustes_estorno_pendentes
    ON distribuicao.ajustes_estorno (rubrica_sigla, estornado_em, pagamento_id)
    WHERE status = 'PENDENTE_APLICACAO';

CREATE TABLE distribuicao.ajuste_estorno_linhas (
    id                         UUID          PRIMARY KEY,
    ajuste_id                  UUID          NOT NULL REFERENCES distribuicao.ajustes_estorno(id) ON DELETE CASCADE,
    processo_origem_id         UUID          NOT NULL REFERENCES distribuicao.processos(id),
    processo_aplicacao_id      UUID          NOT NULL REFERENCES distribuicao.processos(id),
    credito_origem_id          UUID          NOT NULL REFERENCES distribuicao.creditos(id),
    titular_id                 UUID          NOT NULL,
    titular_nome               VARCHAR(200)  NOT NULL,
    obra_id                    UUID          NOT NULL,
    obra_titulo                VARCHAR(300)  NOT NULL,
    fonograma_id               UUID,
    categoria                  VARCHAR(20)   NOT NULL,
    subcategoria_conexa        VARCHAR(20),
    valor_credito_origem       DECIMAL(15,2) NOT NULL,
    valor_ajuste               DECIMAL(15,2) NOT NULL,
    criado_em                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ajuste_estorno_linhas_valor CHECK (
        valor_credito_origem > 0 AND valor_ajuste <= 0
    )
);

CREATE UNIQUE INDEX ux_ajuste_estorno_linhas_credito
    ON distribuicao.ajuste_estorno_linhas (ajuste_id, credito_origem_id);

CREATE INDEX ix_ajuste_estorno_linhas_processo_aplicacao
    ON distribuicao.ajuste_estorno_linhas (processo_aplicacao_id, ajuste_id);

CREATE TABLE distribuicao.ajuste_estorno_historico (
    id             UUID          PRIMARY KEY,
    ajuste_id      UUID          NOT NULL REFERENCES distribuicao.ajustes_estorno(id) ON DELETE CASCADE,
    status         VARCHAR(40)   NOT NULL,
    processo_id    UUID REFERENCES distribuicao.processos(id),
    ocorrido_em    TIMESTAMPTZ   NOT NULL,
    observacao     VARCHAR(500),
    CONSTRAINT ck_ajuste_estorno_historico_status CHECK (status IN (
        'PENDENTE_APLICACAO',
        'PREVISTO',
        'APLICADO',
        'CANCELADO',
        'IGNORADO_SEM_DISTRIBUICAO',
        'PROCESSO_CRIADO_DESATUALIZADO',
        'ERRO_INTEGRIDADE'
    ))
);

CREATE INDEX ix_ajuste_estorno_historico_ajuste
    ON distribuicao.ajuste_estorno_historico (ajuste_id, ocorrido_em ASC);
