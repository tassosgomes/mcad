-- =============================================================================
-- ksqlDB Transformations: ecad_legado → mcad cadastro
--
-- Pipeline: Debezium raw topics → Streams de entrada → Streams transformados
--           → Topics de saída (consumidos pelo JDBC Sink Connector)
--
-- Estratégia:
--   - `codigo` (INTEGER) = PK de negócio vinda do legado
--   - `id` (UUID) = gerado pelo PostgreSQL destino (DEFAULT gen_random_uuid())
--   - FKs emitidas como `*_codigo` (INTEGER) → resolvidas no PG via staging + procedure
--   - Campos desnormalizados e de acoplamento são descartados
--   - Códigos numéricos mapeados para strings do mcad
-- =============================================================================

SET 'auto.offset.reset' = 'earliest';

-- =============================================================================
-- 1. ASSOCIACOES
-- =============================================================================

CREATE STREAM IF NOT EXISTS STR_RAW_ASSOCIACAO (
    after STRUCT<
        cd_associacao INTEGER,
        nm_associacao VARCHAR,
        sg_associacao VARCHAR,
        nr_cnpj VARCHAR,
        in_ativo VARCHAR
    >,
    op VARCHAR
) WITH (
    KAFKA_TOPIC = 'ecad.ecad_legado.tb_associacao',
    VALUE_FORMAT = 'JSON'
);

CREATE STREAM IF NOT EXISTS STR_MCAD_ASSOCIACOES
WITH (
    KAFKA_TOPIC = 'MCAD_ASSOCIACOES',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 1
) AS
SELECT
    after->cd_associacao AS codigo,
    after->nm_associacao AS nome,
    after->sg_associacao AS sigla,
    after->nr_cnpj AS cnpj
FROM STR_RAW_ASSOCIACAO
WHERE op != 'd'
EMIT CHANGES;

-- =============================================================================
-- 2. TITULARES
-- Drop: NM_ASSOCIACAO, SG_ASSOCIACAO, NR_CONTA_BANCO, NR_AGENCIA, CD_BANCO
-- Map: NR_TIPO_PESSOA → tipo, NR_STATUS → status
-- FK: CD_ASSOCIACAO → associacao_codigo (resolvido no PG)
-- =============================================================================

CREATE STREAM IF NOT EXISTS STR_RAW_TITULAR (
    after STRUCT<
        cd_titular INTEGER,
        nm_titular VARCHAR,
        nr_tipo_pessoa INTEGER,
        nr_cpf VARCHAR,
        nr_cnpj VARCHAR,
        nm_nacionalidade VARCHAR,
        nr_cae_ipi VARCHAR,
        cd_associacao INTEGER,
        nr_status INTEGER,
        dt_cadastro VARCHAR,
        dt_alteracao VARCHAR
    >,
    op VARCHAR
) WITH (
    KAFKA_TOPIC = 'ecad.ecad_legado.tb_titular',
    VALUE_FORMAT = 'JSON'
);

CREATE STREAM IF NOT EXISTS STR_MCAD_TITULARES
WITH (
    KAFKA_TOPIC = 'MCAD_TITULARES',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 1
) AS
SELECT
    after->cd_titular AS codigo,
    after->nm_titular AS nome,
    CASE
        WHEN after->nr_tipo_pessoa = 1 THEN 'PF'
        WHEN after->nr_tipo_pessoa = 2 THEN 'PJ'
    END AS tipo,
    after->nr_cpf AS cpf,
    after->nr_cnpj AS cnpj,
    after->nm_nacionalidade AS nacionalidade,
    after->nr_cae_ipi AS cae_ipi,
    after->cd_associacao AS associacao_codigo,
    CASE
        WHEN after->nr_status = 1 THEN 'ATIVO'
        WHEN after->nr_status = 2 THEN 'FALECIDO'
        WHEN after->nr_status = 3 THEN 'TRANSFERINDO'
    END AS status,
    CONCAT(COALESCE(after->dt_cadastro, '2000-01-01'), 'T00:00:00Z') AS criado_em,
    CONCAT(COALESCE(after->dt_alteracao, '2000-01-01'), 'T00:00:00Z') AS atualizado_em
FROM STR_RAW_TITULAR
WHERE op != 'd'
EMIT CHANGES;

-- =============================================================================
-- 3. OBRAS MUSICAIS
-- Drop: NR_QTD_FONOGRAMAS, NR_QTD_EXECUCOES
-- Map: NR_TIPO_OBRA, NR_STATUS, IN_DOMINIO_PUBLICO
-- Self-ref: CD_OBRA_DEPURADA → obra_depurada_codigo
-- =============================================================================

CREATE STREAM IF NOT EXISTS STR_RAW_OBRA (
    after STRUCT<
        cd_obra INTEGER,
        nm_obra VARCHAR,
        nm_subtitulo VARCHAR,
        nr_tipo_obra INTEGER,
        nm_genero VARCHAR,
        cd_iswc VARCHAR,
        nr_status INTEGER,
        ds_bloqueio VARCHAR,
        in_dominio_publico VARCHAR,
        cd_obra_depurada INTEGER,
        dt_cadastro VARCHAR,
        dt_alteracao VARCHAR
    >,
    op VARCHAR
) WITH (
    KAFKA_TOPIC = 'ecad.ecad_legado.tb_obra',
    VALUE_FORMAT = 'JSON'
);

CREATE STREAM IF NOT EXISTS STR_MCAD_OBRAS_MUSICAIS
WITH (
    KAFKA_TOPIC = 'MCAD_OBRAS_MUSICAIS',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 1
) AS
SELECT
    after->cd_obra AS codigo,
    after->nm_obra AS titulo,
    after->nm_subtitulo AS subtitulo,
    CASE
        WHEN after->nr_tipo_obra = 1 THEN 'MUSICAL'
        WHEN after->nr_tipo_obra = 2 THEN 'LITEROMUSICAL'
        WHEN after->nr_tipo_obra = 3 THEN 'VERSAO'
        WHEN after->nr_tipo_obra = 4 THEN 'POT_POURRI'
    END AS tipo,
    after->nm_genero AS genero,
    after->cd_iswc AS iswc,
    CASE
        WHEN after->nr_status = 1 THEN 'PENDENTE'
        WHEN after->nr_status = 2 THEN 'LIBERADO'
        WHEN after->nr_status = 3 THEN 'BLOQUEADO'
        WHEN after->nr_status = 4 THEN 'DOMINIO_PUBLICO'
        WHEN after->nr_status = 5 THEN 'DEPURADA'
    END AS status,
    after->ds_bloqueio AS bloqueio_justificativa,
    CASE
        WHEN after->in_dominio_publico = 'S' THEN true
        ELSE false
    END AS dominio_publico,
    after->cd_obra_depurada AS obra_depurada_codigo,
    CONCAT(COALESCE(after->dt_cadastro, '2000-01-01'), 'T00:00:00Z') AS criado_em,
    CONCAT(COALESCE(after->dt_alteracao, '2000-01-01'), 'T00:00:00Z') AS atualizado_em
FROM STR_RAW_OBRA
WHERE op != 'd'
EMIT CHANGES;

-- =============================================================================
-- 4. TITULARIDADES AUTORAIS
-- Junction: PK composta no legado → codigo composto no staging
-- FKs: CD_OBRA → obra_codigo, CD_TITULAR → titular_codigo
-- =============================================================================

CREATE STREAM IF NOT EXISTS STR_RAW_TITULARIDADE (
    after STRUCT<
        cd_obra INTEGER,
        cd_titular INTEGER,
        nr_categoria INTEGER,
        vl_percentual VARCHAR,
        dt_cadastro VARCHAR
    >,
    op VARCHAR
) WITH (
    KAFKA_TOPIC = 'ecad.ecad_legado.tb_titularidade',
    VALUE_FORMAT = 'JSON'
);

CREATE STREAM IF NOT EXISTS STR_MCAD_TITULARIDADES_AUTORAIS
WITH (
    KAFKA_TOPIC = 'MCAD_TITULARIDADES_AUTORAIS',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 1
) AS
SELECT
    after->cd_obra AS obra_codigo,
    after->cd_titular AS titular_codigo,
    CASE
        WHEN after->nr_categoria = 1 THEN 'AUTOR'
        WHEN after->nr_categoria = 2 THEN 'EDITOR'
    END AS categoria,
    after->vl_percentual AS percentual,
    CONCAT(COALESCE(after->dt_cadastro, '2000-01-01'), 'T00:00:00Z') AS criado_em
FROM STR_RAW_TITULARIDADE
WHERE op != 'd'
EMIT CHANGES;

-- =============================================================================
-- 5. FONOGRAMAS
-- Drop: NM_OBRA (desnormalizado)
-- Map: NR_STATUS, IN_PERC_DESATUALIZADO
-- FKs: CD_OBRA → obra_codigo, CD_FONOGRAMA_DEPURADO → fonograma_depurado_codigo
-- =============================================================================

CREATE STREAM IF NOT EXISTS STR_RAW_FONOGRAMA (
    after STRUCT<
        cd_fonograma INTEGER,
        cd_isrc VARCHAR,
        cd_obra INTEGER,
        nm_pais_origem VARCHAR,
        dt_gravacao VARCHAR,
        dt_lancamento VARCHAR,
        nr_status INTEGER,
        ds_url_audio VARCHAR,
        ds_bloqueio VARCHAR,
        cd_fonograma_depurado INTEGER,
        in_perc_desatualizado VARCHAR,
        dt_cadastro VARCHAR,
        dt_alteracao VARCHAR
    >,
    op VARCHAR
) WITH (
    KAFKA_TOPIC = 'ecad.ecad_legado.tb_fonograma',
    VALUE_FORMAT = 'JSON'
);

CREATE STREAM IF NOT EXISTS STR_MCAD_FONOGRAMAS
WITH (
    KAFKA_TOPIC = 'MCAD_FONOGRAMAS',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 1
) AS
SELECT
    after->cd_fonograma AS codigo,
    after->cd_isrc AS isrc,
    after->cd_obra AS obra_codigo,
    after->nm_pais_origem AS pais_origem,
    after->dt_gravacao AS data_gravacao,
    after->dt_lancamento AS data_lancamento,
    CASE
        WHEN after->nr_status = 1 THEN 'PENDENTE_VALIDACAO'
        WHEN after->nr_status = 2 THEN 'PENDENTE_DOCUMENTACAO'
        WHEN after->nr_status = 3 THEN 'LIBERADO'
        WHEN after->nr_status = 4 THEN 'BLOQUEADO'
        WHEN after->nr_status = 5 THEN 'DEPURADO'
    END AS status,
    after->ds_url_audio AS url_audio,
    after->ds_bloqueio AS bloqueio_justificativa,
    after->cd_fonograma_depurado AS fonograma_depurado_codigo,
    CASE
        WHEN after->in_perc_desatualizado = 'S' THEN true
        ELSE false
    END AS percentuais_desatualizados,
    CONCAT(COALESCE(after->dt_cadastro, '2000-01-01'), 'T00:00:00Z') AS criado_em,
    CONCAT(COALESCE(after->dt_alteracao, '2000-01-01'), 'T00:00:00Z') AS atualizado_em
FROM STR_RAW_FONOGRAMA
WHERE op != 'd'
EMIT CHANGES;

-- =============================================================================
-- 6. PARTICIPACOES CONEXAS
-- Junction: PK composta → staging
-- FKs: CD_FONOGRAMA → fonograma_codigo, CD_TITULAR → titular_codigo
-- =============================================================================

CREATE STREAM IF NOT EXISTS STR_RAW_PARTICIPACAO (
    after STRUCT<
        cd_fonograma INTEGER,
        cd_titular INTEGER,
        nr_categoria INTEGER,
        vl_percentual VARCHAR,
        dt_cadastro VARCHAR
    >,
    op VARCHAR
) WITH (
    KAFKA_TOPIC = 'ecad.ecad_legado.tb_participacao',
    VALUE_FORMAT = 'JSON'
);

CREATE STREAM IF NOT EXISTS STR_MCAD_PARTICIPACOES_CONEXAS
WITH (
    KAFKA_TOPIC = 'MCAD_PARTICIPACOES_CONEXAS',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 1
) AS
SELECT
    after->cd_fonograma AS fonograma_codigo,
    after->cd_titular AS titular_codigo,
    CASE
        WHEN after->nr_categoria = 1 THEN 'INTERPRETE'
        WHEN after->nr_categoria = 2 THEN 'PRODUTOR_FONOGRAFICO'
        WHEN after->nr_categoria = 3 THEN 'MUSICO_EXECUTANTE'
    END AS categoria,
    after->vl_percentual AS percentual,
    CONCAT(COALESCE(after->dt_cadastro, '2000-01-01'), 'T00:00:00Z') AS criado_em
FROM STR_RAW_PARTICIPACAO
WHERE op != 'd'
EMIT CHANGES;

-- =============================================================================
-- 7. HISTORICO BLOQUEIOS
-- Map: NR_TIPO_ENTIDADE, NR_ACAO
-- FK polimórfica: CD_ENTIDADE → entidade_codigo (resolvido no PG via tipo)
-- =============================================================================

CREATE STREAM IF NOT EXISTS STR_RAW_HISTORICO_BLOQUEIO (
    after STRUCT<
        cd_historico INTEGER,
        nr_tipo_entidade INTEGER,
        cd_entidade INTEGER,
        nr_acao INTEGER,
        ds_justificativa VARCHAR,
        dt_ocorrencia VARCHAR
    >,
    op VARCHAR
) WITH (
    KAFKA_TOPIC = 'ecad.ecad_legado.tb_historico_bloqueio',
    VALUE_FORMAT = 'JSON'
);

CREATE STREAM IF NOT EXISTS STR_MCAD_HISTORICO_BLOQUEIOS
WITH (
    KAFKA_TOPIC = 'MCAD_HISTORICO_BLOQUEIOS',
    VALUE_FORMAT = 'JSON',
    PARTITIONS = 1
) AS
SELECT
    after->cd_historico AS codigo,
    CASE
        WHEN after->nr_tipo_entidade = 1 THEN 'OBRA'
        WHEN after->nr_tipo_entidade = 2 THEN 'FONOGRAMA'
    END AS entidade_tipo,
    after->cd_entidade AS entidade_codigo,
    CASE
        WHEN after->nr_acao = 1 THEN 'BLOQUEIO'
        WHEN after->nr_acao = 2 THEN 'DESBLOQUEIO'
    END AS acao,
    after->ds_justificativa AS justificativa,
    CONCAT(COALESCE(after->dt_ocorrencia, '2000-01-01'), 'T00:00:00Z') AS data_hora
FROM STR_RAW_HISTORICO_BLOQUEIO
WHERE op != 'd'
EMIT CHANGES;
