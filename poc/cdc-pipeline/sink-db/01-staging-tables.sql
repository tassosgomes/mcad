-- =============================================================================
-- Staging Tables (schema cdc_staging no PostgreSQL mcad)
--
-- O JDBC Sink Connector persiste aqui. Uma procedure resolve as FKs
-- (codigo → UUID id) e faz upsert nas tabelas finais do schema cadastro.
--
-- Executar no PostgreSQL mcad (porta 5432, database mcad)
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS cdc_staging;

-- ---------------------------------------------------------------------------
-- Staging: Associações (sem FK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cdc_staging.associacoes (
    codigo   INTEGER PRIMARY KEY,
    nome     VARCHAR(200) NOT NULL,
    sigla    VARCHAR(20) NOT NULL,
    cnpj     VARCHAR(18) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Staging: Titulares (FK via associacao_codigo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cdc_staging.titulares (
    codigo            INTEGER PRIMARY KEY,
    nome              VARCHAR(200) NOT NULL,
    tipo              VARCHAR(2) NOT NULL,
    cpf               VARCHAR(11),
    cnpj              VARCHAR(14),
    nacionalidade     VARCHAR(100),
    cae_ipi           VARCHAR(20),
    associacao_codigo INTEGER NOT NULL,
    status            VARCHAR(15) NOT NULL,
    criado_em         VARCHAR(30),
    atualizado_em     VARCHAR(30)
);

-- ---------------------------------------------------------------------------
-- Staging: Obras Musicais (self-ref via obra_depurada_codigo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cdc_staging.obras_musicais (
    codigo                INTEGER PRIMARY KEY,
    titulo                VARCHAR(300) NOT NULL,
    subtitulo             VARCHAR(300),
    tipo                  VARCHAR(15) NOT NULL,
    genero                VARCHAR(100),
    iswc                  VARCHAR(20),
    status                VARCHAR(20) NOT NULL,
    bloqueio_justificativa VARCHAR(500),
    dominio_publico       BOOLEAN NOT NULL DEFAULT false,
    obra_depurada_codigo  INTEGER,
    criado_em             VARCHAR(30),
    atualizado_em         VARCHAR(30)
);

-- ---------------------------------------------------------------------------
-- Staging: Titularidades Autorais (FKs via obra_codigo + titular_codigo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cdc_staging.titularidades_autorais (
    obra_codigo    INTEGER NOT NULL,
    titular_codigo INTEGER NOT NULL,
    categoria      VARCHAR(10) NOT NULL,
    percentual     VARCHAR(20) NOT NULL,
    criado_em      VARCHAR(30),
    PRIMARY KEY (obra_codigo, titular_codigo, categoria)
);

-- ---------------------------------------------------------------------------
-- Staging: Fonogramas (FK via obra_codigo, self-ref via fonograma_depurado_codigo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cdc_staging.fonogramas (
    codigo                    INTEGER PRIMARY KEY,
    isrc                      VARCHAR(12),
    obra_codigo               INTEGER NOT NULL,
    pais_origem               VARCHAR(100),
    data_gravacao             VARCHAR(20),
    data_lancamento           VARCHAR(20),
    status                    VARCHAR(25) NOT NULL,
    url_audio                 VARCHAR(500),
    bloqueio_justificativa    VARCHAR(500),
    fonograma_depurado_codigo INTEGER,
    percentuais_desatualizados BOOLEAN NOT NULL DEFAULT false,
    criado_em                 VARCHAR(30),
    atualizado_em             VARCHAR(30)
);

-- ---------------------------------------------------------------------------
-- Staging: Participações Conexas (FKs via fonograma_codigo + titular_codigo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cdc_staging.participacoes_conexas (
    fonograma_codigo INTEGER NOT NULL,
    titular_codigo   INTEGER NOT NULL,
    categoria        VARCHAR(25) NOT NULL,
    percentual       VARCHAR(20),
    criado_em        VARCHAR(30),
    PRIMARY KEY (fonograma_codigo, titular_codigo, categoria)
);

-- ---------------------------------------------------------------------------
-- Staging: Histórico Bloqueios (FK polimórfica via entidade_codigo + tipo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cdc_staging.historico_bloqueios (
    codigo          INTEGER PRIMARY KEY,
    entidade_tipo   VARCHAR(15) NOT NULL,
    entidade_codigo INTEGER NOT NULL,
    acao            VARCHAR(15) NOT NULL,
    justificativa   VARCHAR(500),
    data_hora       VARCHAR(30)
);

-- =============================================================================
-- Procedure: Resolve FKs (codigo → UUID) e faz upsert no schema cadastro
--
-- Chamada periodicamente ou via trigger após cada batch do Sink Connector.
-- Ordem de processamento respeita dependências de FK.
-- =============================================================================

CREATE OR REPLACE PROCEDURE cdc_staging.sync_to_cadastro()
LANGUAGE plpgsql AS $$
BEGIN
    -- -----------------------------------------------------------------
    -- 1. Associações (sem FK — processa primeiro)
    -- -----------------------------------------------------------------
    INSERT INTO cadastro.associacoes (id, codigo, nome, sigla, cnpj)
    SELECT
        gen_random_uuid(),
        s.codigo,
        s.nome,
        s.sigla,
        s.cnpj
    FROM cdc_staging.associacoes s
    ON CONFLICT (codigo) DO UPDATE SET
        nome  = EXCLUDED.nome,
        sigla = EXCLUDED.sigla,
        cnpj  = EXCLUDED.cnpj;

    -- -----------------------------------------------------------------
    -- 2. Titulares (FK → associacoes.codigo)
    -- -----------------------------------------------------------------
    INSERT INTO cadastro.titulares (id, codigo, nome, tipo, cpf, cnpj, nacionalidade, cae_ipi, associacao_id, status, criado_em, atualizado_em)
    SELECT
        gen_random_uuid(),
        s.codigo,
        s.nome,
        s.tipo,
        s.cpf,
        s.cnpj,
        s.nacionalidade,
        s.cae_ipi,
        a.id,  -- FK resolvida: associacao_codigo → associacoes.id
        s.status,
        s.criado_em::timestamptz,
        s.atualizado_em::timestamptz
    FROM cdc_staging.titulares s
    JOIN cadastro.associacoes a ON a.codigo = s.associacao_codigo
    ON CONFLICT (codigo) DO UPDATE SET
        nome           = EXCLUDED.nome,
        tipo           = EXCLUDED.tipo,
        cpf            = EXCLUDED.cpf,
        cnpj           = EXCLUDED.cnpj,
        nacionalidade  = EXCLUDED.nacionalidade,
        cae_ipi        = EXCLUDED.cae_ipi,
        associacao_id  = EXCLUDED.associacao_id,
        status         = EXCLUDED.status,
        atualizado_em  = EXCLUDED.atualizado_em;

    -- -----------------------------------------------------------------
    -- 3. Obras Musicais (self-ref → obras_musicais.codigo)
    -- -----------------------------------------------------------------
    -- Primeiro: insere/atualiza sem self-ref
    INSERT INTO cadastro.obras_musicais (id, codigo, titulo, subtitulo, tipo, genero, iswc, status, bloqueio_justificativa, dominio_publico, criado_em, atualizado_em)
    SELECT
        gen_random_uuid(),
        s.codigo,
        s.titulo,
        s.subtitulo,
        s.tipo,
        s.genero,
        s.iswc,
        s.status,
        s.bloqueio_justificativa,
        s.dominio_publico,
        s.criado_em::timestamptz,
        s.atualizado_em::timestamptz
    FROM cdc_staging.obras_musicais s
    ON CONFLICT (codigo) DO UPDATE SET
        titulo                 = EXCLUDED.titulo,
        subtitulo              = EXCLUDED.subtitulo,
        tipo                   = EXCLUDED.tipo,
        genero                 = EXCLUDED.genero,
        iswc                   = EXCLUDED.iswc,
        status                 = EXCLUDED.status,
        bloqueio_justificativa = EXCLUDED.bloqueio_justificativa,
        dominio_publico        = EXCLUDED.dominio_publico,
        atualizado_em          = EXCLUDED.atualizado_em;

    -- Depois: resolve self-ref (obra depurada)
    UPDATE cadastro.obras_musicais o
    SET obra_depurada_para_id = dep.id
    FROM cdc_staging.obras_musicais s
    JOIN cadastro.obras_musicais dep ON dep.codigo = s.obra_depurada_codigo
    WHERE o.codigo = s.codigo
      AND s.obra_depurada_codigo IS NOT NULL;

    -- -----------------------------------------------------------------
    -- 4. Titularidades Autorais (FK → obras + titulares via codigo)
    -- -----------------------------------------------------------------
    INSERT INTO cadastro.titularidades_autorais (id, obra_id, titular_id, categoria, percentual, criado_em)
    SELECT
        gen_random_uuid(),
        o.id,
        t.id,
        s.categoria,
        s.percentual::decimal(8,4),
        s.criado_em::timestamptz
    FROM cdc_staging.titularidades_autorais s
    JOIN cadastro.obras_musicais o ON o.codigo = s.obra_codigo
    JOIN cadastro.titulares t ON t.codigo = s.titular_codigo
    ON CONFLICT (obra_id, titular_id, categoria) DO UPDATE SET
        percentual = EXCLUDED.percentual;

    -- -----------------------------------------------------------------
    -- 5. Fonogramas (FK → obras via codigo, self-ref)
    -- -----------------------------------------------------------------
    INSERT INTO cadastro.fonogramas (id, codigo, isrc, obra_id, pais_origem, data_gravacao, data_lancamento, status, url_audio, bloqueio_justificativa, percentuais_desatualizados, criado_em, atualizado_em)
    SELECT
        gen_random_uuid(),
        s.codigo,
        s.isrc,
        o.id,
        s.pais_origem,
        NULLIF(s.data_gravacao, '')::date,
        NULLIF(s.data_lancamento, '')::date,
        s.status,
        s.url_audio,
        s.bloqueio_justificativa,
        s.percentuais_desatualizados,
        s.criado_em::timestamptz,
        s.atualizado_em::timestamptz
    FROM cdc_staging.fonogramas s
    JOIN cadastro.obras_musicais o ON o.codigo = s.obra_codigo
    ON CONFLICT (codigo) DO UPDATE SET
        isrc                       = EXCLUDED.isrc,
        pais_origem                = EXCLUDED.pais_origem,
        data_gravacao              = EXCLUDED.data_gravacao,
        data_lancamento            = EXCLUDED.data_lancamento,
        status                     = EXCLUDED.status,
        url_audio                  = EXCLUDED.url_audio,
        bloqueio_justificativa     = EXCLUDED.bloqueio_justificativa,
        percentuais_desatualizados = EXCLUDED.percentuais_desatualizados,
        atualizado_em              = EXCLUDED.atualizado_em;

    -- Resolve self-ref (fonograma depurado)
    UPDATE cadastro.fonogramas f
    SET fonograma_depurado_para_id = dep.id
    FROM cdc_staging.fonogramas s
    JOIN cadastro.fonogramas dep ON dep.codigo = s.fonograma_depurado_codigo
    WHERE f.codigo = s.codigo
      AND s.fonograma_depurado_codigo IS NOT NULL;

    -- -----------------------------------------------------------------
    -- 6. Participações Conexas (FK → fonogramas + titulares via codigo)
    -- -----------------------------------------------------------------
    INSERT INTO cadastro.participacoes_conexas (id, fonograma_id, titular_id, categoria, percentual, criado_em)
    SELECT
        gen_random_uuid(),
        f.id,
        t.id,
        s.categoria,
        NULLIF(s.percentual, '')::decimal(8,4),
        s.criado_em::timestamptz
    FROM cdc_staging.participacoes_conexas s
    JOIN cadastro.fonogramas f ON f.codigo = s.fonograma_codigo
    JOIN cadastro.titulares t ON t.codigo = s.titular_codigo
    ON CONFLICT (fonograma_id, titular_id, categoria) DO UPDATE SET
        percentual = EXCLUDED.percentual;

    -- -----------------------------------------------------------------
    -- 7. Histórico Bloqueios (FK polimórfica via tipo + codigo)
    -- -----------------------------------------------------------------
    INSERT INTO cadastro.historico_bloqueios (id, entidade_tipo, entidade_id, acao, justificativa, data_hora)
    SELECT
        gen_random_uuid(),
        s.entidade_tipo,
        CASE
            WHEN s.entidade_tipo = 'OBRA'      THEN (SELECT id FROM cadastro.obras_musicais WHERE codigo = s.entidade_codigo)
            WHEN s.entidade_tipo = 'FONOGRAMA'  THEN (SELECT id FROM cadastro.fonogramas WHERE codigo = s.entidade_codigo)
        END,
        s.acao,
        s.justificativa,
        s.data_hora::timestamptz
    FROM cdc_staging.historico_bloqueios s
    WHERE CASE
        WHEN s.entidade_tipo = 'OBRA'      THEN EXISTS (SELECT 1 FROM cadastro.obras_musicais WHERE codigo = s.entidade_codigo)
        WHEN s.entidade_tipo = 'FONOGRAMA'  THEN EXISTS (SELECT 1 FROM cadastro.fonogramas WHERE codigo = s.entidade_codigo)
    END
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'sync_to_cadastro concluído com sucesso';
END;
$$;

-- =============================================================================
-- Sequence adjustment (executar APÓS carga inicial completa)
-- Ajusta as sequences para continuar a partir do MAX(codigo) + 1
-- =============================================================================
-- CALL cdc_staging.adjust_sequences();

CREATE OR REPLACE PROCEDURE cdc_staging.adjust_sequences()
LANGUAGE plpgsql AS $$
DECLARE
    max_assoc   INTEGER;
    max_titular INTEGER;
    max_obra    INTEGER;
    max_fono    INTEGER;
BEGIN
    SELECT COALESCE(MAX(codigo), 0) INTO max_assoc   FROM cadastro.associacoes;
    SELECT COALESCE(MAX(codigo), 0) INTO max_titular FROM cadastro.titulares;
    SELECT COALESCE(MAX(codigo), 0) INTO max_obra    FROM cadastro.obras_musicais;
    SELECT COALESCE(MAX(codigo), 0) INTO max_fono    FROM cadastro.fonogramas;

    -- Cria sequences se não existirem (para quando mcad começar a gerar codigos)
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS cadastro.seq_associacao_codigo START WITH %s', max_assoc + 1);
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS cadastro.seq_titular_codigo START WITH %s', max_titular + 1);
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS cadastro.seq_obra_codigo START WITH %s', max_obra + 1);
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS cadastro.seq_fonograma_codigo START WITH %s', max_fono + 1);

    -- Ajusta se já existirem
    PERFORM setval('cadastro.seq_associacao_codigo', max_assoc) WHERE max_assoc > 0;
    PERFORM setval('cadastro.seq_titular_codigo', max_titular) WHERE max_titular > 0;
    PERFORM setval('cadastro.seq_obra_codigo', max_obra) WHERE max_obra > 0;
    PERFORM setval('cadastro.seq_fonograma_codigo', max_fono) WHERE max_fono > 0;

    RAISE NOTICE 'Sequences ajustadas — assoc:%, titular:%, obra:%, fono:%',
        max_assoc, max_titular, max_obra, max_fono;
END;
$$;
