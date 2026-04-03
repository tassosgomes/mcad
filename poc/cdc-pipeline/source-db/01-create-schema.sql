-- =============================================================================
-- Schema Legado ECAD (simulado)
-- Práticas de ~20 anos: prefixos, PKs sequenciais, status numérico,
-- desnormalização, acoplamento entre domínios
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS ecad_legado;

-- Sequences (simulando Oracle SEQUENCE)
CREATE SEQUENCE ecad_legado.seq_dominio START WITH 100;
CREATE SEQUENCE ecad_legado.seq_associacao START WITH 10;
CREATE SEQUENCE ecad_legado.seq_titular START WITH 1000;
CREATE SEQUENCE ecad_legado.seq_obra START WITH 5000;
CREATE SEQUENCE ecad_legado.seq_fonograma START WITH 10000;
CREATE SEQUENCE ecad_legado.seq_historico START WITH 1;

-- ---------------------------------------------------------------------------
-- Tabela de domínio (lookup genérica para todos os tipos/status)
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_DOMINIO (
    CD_DOMINIO    INTEGER PRIMARY KEY DEFAULT nextval('ecad_legado.seq_dominio'),
    CD_TIPO       VARCHAR(30) NOT NULL,
    NR_VALOR      INTEGER NOT NULL,
    DS_VALOR      VARCHAR(100) NOT NULL,
    UNIQUE(CD_TIPO, NR_VALOR)
);

-- ---------------------------------------------------------------------------
-- Tabela de bancos (simula acoplamento com domínio financeiro)
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_BANCO (
    CD_BANCO   INTEGER PRIMARY KEY,
    NM_BANCO   VARCHAR(100) NOT NULL,
    NR_CODIGO  VARCHAR(10) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Associações de Gestão Coletiva
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_ASSOCIACAO (
    CD_ASSOCIACAO   INTEGER PRIMARY KEY DEFAULT nextval('ecad_legado.seq_associacao'),
    NM_ASSOCIACAO   VARCHAR(200) NOT NULL,
    SG_ASSOCIACAO   VARCHAR(20) NOT NULL UNIQUE,
    NR_CNPJ         VARCHAR(18) NOT NULL UNIQUE,
    IN_ATIVO        CHAR(1) DEFAULT 'S' CHECK (IN_ATIVO IN ('S', 'N'))
);

-- ---------------------------------------------------------------------------
-- Titulares (acoplado — contém dados de distribuição/financeiro)
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_TITULAR (
    CD_TITULAR       INTEGER PRIMARY KEY DEFAULT nextval('ecad_legado.seq_titular'),
    NM_TITULAR       VARCHAR(200) NOT NULL,
    NR_TIPO_PESSOA   INTEGER NOT NULL,
    NR_CPF           VARCHAR(11),
    NR_CNPJ          VARCHAR(14),
    NM_NACIONALIDADE VARCHAR(100),
    NR_CAE_IPI       VARCHAR(20),
    CD_ASSOCIACAO    INTEGER NOT NULL REFERENCES ecad_legado.TB_ASSOCIACAO(CD_ASSOCIACAO),
    NM_ASSOCIACAO    VARCHAR(200),            -- DESNORMALIZADO
    SG_ASSOCIACAO    VARCHAR(20),             -- DESNORMALIZADO
    NR_STATUS        INTEGER DEFAULT 1,       -- 1=Ativo, 2=Falecido, 3=Transferindo
    -- Acoplamento: dados de distribuição/financeiro
    NR_CONTA_BANCO   VARCHAR(20),
    NR_AGENCIA       VARCHAR(10),
    CD_BANCO         INTEGER REFERENCES ecad_legado.TB_BANCO(CD_BANCO),
    DT_CADASTRO      DATE DEFAULT CURRENT_DATE,
    DT_ALTERACAO     DATE DEFAULT CURRENT_DATE,
    -- Constraints
    CHECK (NR_TIPO_PESSOA IN (1, 2)),
    CHECK (NR_STATUS IN (1, 2, 3)),
    CHECK (
        (NR_TIPO_PESSOA = 1 AND NR_CPF IS NOT NULL AND NR_CNPJ IS NULL)
        OR
        (NR_TIPO_PESSOA = 2 AND NR_CNPJ IS NOT NULL AND NR_CPF IS NULL)
    )
);

CREATE UNIQUE INDEX uq_titular_cpf ON ecad_legado.TB_TITULAR(NR_CPF) WHERE NR_CPF IS NOT NULL;
CREATE UNIQUE INDEX uq_titular_cnpj ON ecad_legado.TB_TITULAR(NR_CNPJ) WHERE NR_CNPJ IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Obras Musicais (com contadores desnormalizados)
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_OBRA (
    CD_OBRA              INTEGER PRIMARY KEY DEFAULT nextval('ecad_legado.seq_obra'),
    NM_OBRA              VARCHAR(300) NOT NULL,
    NM_SUBTITULO         VARCHAR(300),
    NR_TIPO_OBRA         INTEGER NOT NULL,
    NM_GENERO            VARCHAR(100),
    CD_ISWC              VARCHAR(20),
    NR_STATUS            INTEGER DEFAULT 1,
    DS_BLOQUEIO          VARCHAR(500),
    IN_DOMINIO_PUBLICO   CHAR(1) DEFAULT 'N' CHECK (IN_DOMINIO_PUBLICO IN ('S', 'N')),
    CD_OBRA_DEPURADA     INTEGER REFERENCES ecad_legado.TB_OBRA(CD_OBRA),
    -- Acoplamento: contadores desnormalizados de outros domínios
    NR_QTD_FONOGRAMAS    INTEGER DEFAULT 0,
    NR_QTD_EXECUCOES     INTEGER DEFAULT 0,
    DT_CADASTRO          DATE DEFAULT CURRENT_DATE,
    DT_ALTERACAO         DATE DEFAULT CURRENT_DATE,
    -- Constraints
    CHECK (NR_TIPO_OBRA IN (1, 2, 3, 4)),
    CHECK (NR_STATUS IN (1, 2, 3, 4, 5))
);

CREATE UNIQUE INDEX uq_obra_iswc ON ecad_legado.TB_OBRA(CD_ISWC) WHERE CD_ISWC IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Titularidades Autorais (junction — PK composta, sem surrogate key)
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_TITULARIDADE (
    CD_OBRA       INTEGER NOT NULL REFERENCES ecad_legado.TB_OBRA(CD_OBRA),
    CD_TITULAR    INTEGER NOT NULL REFERENCES ecad_legado.TB_TITULAR(CD_TITULAR),
    NR_CATEGORIA  INTEGER NOT NULL CHECK (NR_CATEGORIA IN (1, 2)),
    VL_PERCENTUAL DECIMAL(8,4) NOT NULL CHECK (VL_PERCENTUAL > 0 AND VL_PERCENTUAL <= 100),
    DT_CADASTRO   DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (CD_OBRA, CD_TITULAR, NR_CATEGORIA)
);

-- ---------------------------------------------------------------------------
-- Fonogramas (com dados desnormalizados da obra)
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_FONOGRAMA (
    CD_FONOGRAMA           INTEGER PRIMARY KEY DEFAULT nextval('ecad_legado.seq_fonograma'),
    CD_ISRC                VARCHAR(12),
    CD_OBRA                INTEGER NOT NULL REFERENCES ecad_legado.TB_OBRA(CD_OBRA),
    NM_PAIS_ORIGEM         VARCHAR(100),
    DT_GRAVACAO            DATE,
    DT_LANCAMENTO          DATE,
    NR_STATUS              INTEGER DEFAULT 1,
    DS_URL_AUDIO           VARCHAR(500),
    DS_BLOQUEIO            VARCHAR(500),
    CD_FONOGRAMA_DEPURADO  INTEGER REFERENCES ecad_legado.TB_FONOGRAMA(CD_FONOGRAMA),
    IN_PERC_DESATUALIZADO  CHAR(1) DEFAULT 'N' CHECK (IN_PERC_DESATUALIZADO IN ('S', 'N')),
    -- Acoplamento: dados desnormalizados da obra
    NM_OBRA                VARCHAR(300),
    DT_CADASTRO            DATE DEFAULT CURRENT_DATE,
    DT_ALTERACAO           DATE DEFAULT CURRENT_DATE,
    -- Constraints
    CHECK (NR_STATUS IN (1, 2, 3, 4, 5))
);

CREATE UNIQUE INDEX uq_fonograma_isrc ON ecad_legado.TB_FONOGRAMA(CD_ISRC) WHERE CD_ISRC IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Participações Conexas (junction — PK composta)
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_PARTICIPACAO (
    CD_FONOGRAMA  INTEGER NOT NULL REFERENCES ecad_legado.TB_FONOGRAMA(CD_FONOGRAMA),
    CD_TITULAR    INTEGER NOT NULL REFERENCES ecad_legado.TB_TITULAR(CD_TITULAR),
    NR_CATEGORIA  INTEGER NOT NULL CHECK (NR_CATEGORIA IN (1, 2, 3)),
    VL_PERCENTUAL DECIMAL(8,4),
    DT_CADASTRO   DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (CD_FONOGRAMA, CD_TITULAR, NR_CATEGORIA)
);

-- ---------------------------------------------------------------------------
-- Histórico de Bloqueios (polimórfica)
-- ---------------------------------------------------------------------------
CREATE TABLE ecad_legado.TB_HISTORICO_BLOQUEIO (
    CD_HISTORICO     INTEGER PRIMARY KEY DEFAULT nextval('ecad_legado.seq_historico'),
    NR_TIPO_ENTIDADE INTEGER NOT NULL CHECK (NR_TIPO_ENTIDADE IN (1, 2)),
    CD_ENTIDADE      INTEGER NOT NULL,
    NR_ACAO          INTEGER NOT NULL CHECK (NR_ACAO IN (1, 2)),
    DS_JUSTIFICATIVA VARCHAR(500),
    DT_OCORRENCIA    DATE DEFAULT CURRENT_DATE
);

CREATE INDEX ix_hist_entidade ON ecad_legado.TB_HISTORICO_BLOQUEIO(NR_TIPO_ENTIDADE, CD_ENTIDADE);
