ALTER TABLE distribuicao.processos
    ADD COLUMN total_obras INTEGER,
    ADD COLUMN total_pontos DECIMAL(18,6),
    ADD COLUMN total_creditos INTEGER,
    ADD COLUMN valor_total_calculado DECIMAL(15,2);

CREATE TABLE distribuicao.creditos (
    id                    UUID           PRIMARY KEY,
    processo_id           UUID           NOT NULL REFERENCES distribuicao.processos(id) ON DELETE CASCADE,
    titular_id            UUID           NOT NULL,
    titular_nome          VARCHAR(200)   NOT NULL,
    obra_id               UUID           NOT NULL,
    obra_titulo           VARCHAR(300)   NOT NULL,
    fonograma_id          UUID,
    categoria             VARCHAR(20)    NOT NULL,
    subcategoria_conexa   VARCHAR(20),
    percentual_aplicado   DECIMAL(9,6)   NOT NULL,
    valor_obra            DECIMAL(15,2)  NOT NULL,
    valor_credito         DECIMAL(15,2)  NOT NULL,
    pontos_obra           DECIMAL(18,6)  NOT NULL,
    status                VARCHAR(20)    NOT NULL,
    criado_em             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_creditos_processo
    ON distribuicao.creditos (processo_id);

CREATE INDEX ix_creditos_processo_categoria
    ON distribuicao.creditos (processo_id, categoria);

CREATE INDEX ix_creditos_processo_titular
    ON distribuicao.creditos (processo_id, titular_id);

CREATE INDEX ix_creditos_processo_obra
    ON distribuicao.creditos (processo_id, obra_id);

CREATE INDEX ix_creditos_processo_criado
    ON distribuicao.creditos (processo_id, criado_em, id);
