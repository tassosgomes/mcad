-- =============================================================================
-- Seed Data — Dados realistas para testar o pipeline CDC
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TB_DOMINIO — Lookup de tipos e status
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_DOMINIO (CD_DOMINIO, CD_TIPO, NR_VALOR, DS_VALOR) VALUES
-- Tipo Pessoa
(1, 'TIPO_PESSOA', 1, 'Pessoa Física'),
(2, 'TIPO_PESSOA', 2, 'Pessoa Jurídica'),
-- Status Titular
(10, 'STATUS_TITULAR', 1, 'Ativo'),
(11, 'STATUS_TITULAR', 2, 'Falecido'),
(12, 'STATUS_TITULAR', 3, 'Transferindo'),
-- Tipo Obra
(20, 'TIPO_OBRA', 1, 'Musical'),
(21, 'TIPO_OBRA', 2, 'Literomusical'),
(22, 'TIPO_OBRA', 3, 'Versão'),
(23, 'TIPO_OBRA', 4, 'Pot-Pourri'),
-- Status Obra
(30, 'STATUS_OBRA', 1, 'Pendente'),
(31, 'STATUS_OBRA', 2, 'Liberado'),
(32, 'STATUS_OBRA', 3, 'Bloqueado'),
(33, 'STATUS_OBRA', 4, 'Domínio Público'),
(34, 'STATUS_OBRA', 5, 'Depurada'),
-- Status Fonograma
(40, 'STATUS_FONOGRAMA', 1, 'Pendente Validação'),
(41, 'STATUS_FONOGRAMA', 2, 'Pendente Documentação'),
(42, 'STATUS_FONOGRAMA', 3, 'Liberado'),
(43, 'STATUS_FONOGRAMA', 4, 'Bloqueado'),
(44, 'STATUS_FONOGRAMA', 5, 'Depurado'),
-- Categoria Autoral
(50, 'CATEGORIA_AUTORAL', 1, 'Autor'),
(51, 'CATEGORIA_AUTORAL', 2, 'Editor'),
-- Categoria Conexo
(60, 'CATEGORIA_CONEXO', 1, 'Intérprete'),
(61, 'CATEGORIA_CONEXO', 2, 'Produtor Fonográfico'),
(62, 'CATEGORIA_CONEXO', 3, 'Músico Executante'),
-- Tipo Entidade (Histórico)
(70, 'TIPO_ENTIDADE', 1, 'Obra'),
(71, 'TIPO_ENTIDADE', 2, 'Fonograma'),
-- Ação Bloqueio
(80, 'ACAO_BLOQUEIO', 1, 'Bloqueio'),
(81, 'ACAO_BLOQUEIO', 2, 'Desbloqueio');

-- ---------------------------------------------------------------------------
-- TB_BANCO — Bancos (acoplamento)
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_BANCO (CD_BANCO, NM_BANCO, NR_CODIGO) VALUES
(1, 'Banco do Brasil', '001'),
(2, 'Bradesco', '237'),
(3, 'Itaú Unibanco', '341'),
(4, 'Caixa Econômica Federal', '104'),
(5, 'Santander', '033');

-- ---------------------------------------------------------------------------
-- TB_ASSOCIACAO — 7 associações reais do ECAD
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_ASSOCIACAO (CD_ASSOCIACAO, NM_ASSOCIACAO, SG_ASSOCIACAO, NR_CNPJ, IN_ATIVO) VALUES
(1, 'Associação Brasileira de Música e Artes',      'ABRAMUS', '50.997.063/0001-32', 'S'),
(2, 'União Brasileira de Compositores',             'UBC',     '00.735.257/0001-27', 'S'),
(3, 'Associação de Músicos, Arranjadores e Regentes','AMAR',   '30.628.478/0001-08', 'S'),
(4, 'Associação de Intérpretes e Músicos',          'ASSIM',   '59.711.471/0001-58', 'S'),
(5, 'Sociedade Brasileira de Autores, Compositores e Escritores de Música', 'SBACEM', '33.731.527/0001-49', 'S'),
(6, 'Sociedade Independente de Compositores e Autores Musicais', 'SICAM', '30.382.478/0001-90', 'S'),
(7, 'Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais', 'SOCINPRO', '75.220.985/0001-00', 'S');

-- ---------------------------------------------------------------------------
-- TB_TITULAR — Titulares fictícios (PF e PJ)
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_TITULAR (CD_TITULAR, NM_TITULAR, NR_TIPO_PESSOA, NR_CPF, NR_CNPJ, NM_NACIONALIDADE, NR_CAE_IPI, CD_ASSOCIACAO, NM_ASSOCIACAO, SG_ASSOCIACAO, NR_STATUS, NR_CONTA_BANCO, NR_AGENCIA, CD_BANCO) VALUES
-- Autores (PF)
(1001, 'Carlos Eduardo Silva',      1, '12345678901', NULL, 'Brasileira', NULL,  1, 'Associação Brasileira de Música e Artes', 'ABRAMUS', 1, '12345-6', '0001', 1),
(1002, 'Maria Helena Costa',        1, '98765432100', NULL, 'Brasileira', NULL,  2, 'União Brasileira de Compositores', 'UBC', 1, '65432-1', '1234', 2),
(1003, 'João Pedro Almeida',        1, '11122233344', NULL, 'Brasileira', NULL,  1, 'Associação Brasileira de Música e Artes', 'ABRAMUS', 1, '11111-1', '0002', 3),
(1004, 'Ana Beatriz Ferreira',      1, '55566677788', NULL, 'Brasileira', NULL,  3, 'Associação de Músicos, Arranjadores e Regentes', 'AMAR', 1, NULL, NULL, NULL),
(1005, 'Roberto Carlos Braga',      1, '99988877766', NULL, 'Brasileira', NULL,  2, 'União Brasileira de Compositores', 'UBC', 2, '99999-9', '5678', 1),
-- Intérpretes (PF)
(1006, 'Fernanda Oliveira Santos',   1, '44455566677', NULL, 'Brasileira', NULL,  4, 'Associação de Intérpretes e Músicos', 'ASSIM', 1, '33333-3', '4321', 4),
(1007, 'Ricardo Nascimento',         1, '22233344455', NULL, 'Brasileira', NULL,  4, 'Associação de Intérpretes e Músicos', 'ASSIM', 1, NULL, NULL, NULL),
-- Músicos (PF)
(1008, 'Paulo Henrique Dias',        1, '66677788899', NULL, 'Brasileira', NULL,  3, 'Associação de Músicos, Arranjadores e Regentes', 'AMAR', 1, '55555-5', '9876', 5),
-- Editoras (PJ)
(1009, 'Editora Musical Sol Nascente Ltda', 2, NULL, '12345678000190', 'Brasileira', 'CAE001', 5, 'Sociedade Brasileira de Autores, Compositores e Escritores de Música', 'SBACEM', 1, '77777-7', '1111', 2),
(1010, 'Produções Harmonia S.A.',    2, NULL, '98765432000111', 'Brasileira', 'CAE002', 6, 'Sociedade Independente de Compositores e Autores Musicais', 'SICAM', 1, '88888-8', '2222', 3);

-- ---------------------------------------------------------------------------
-- TB_OBRA — Obras musicais fictícias
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_OBRA (CD_OBRA, NM_OBRA, NM_SUBTITULO, NR_TIPO_OBRA, NM_GENERO, CD_ISWC, NR_STATUS, IN_DOMINIO_PUBLICO, NR_QTD_FONOGRAMAS, NR_QTD_EXECUCOES) VALUES
(5001, 'Canção do Amanhecer',    NULL,               2, 'MPB',        'T0123456789', 2, 'N', 2, 150),
(5002, 'Ritmo da Cidade',        'Versão Acústica',  1, 'Pop',        'T0987654321', 2, 'N', 1, 85),
(5003, 'Saudade Eterna',         NULL,               2, 'Sertanejo',  'T1111111111', 1, 'N', 0, 0),
(5004, 'Noite de Verão',         'Summer Night',     1, 'Bossa Nova', 'T2222222222', 2, 'N', 1, 230),
(5005, 'Pot-Pourri Sertanejo',   NULL,               4, 'Sertanejo',  NULL,          2, 'N', 1, 45),
(5006, 'Asa Branca',             NULL,               2, 'Forró',      'T3333333333', 4, 'S', 3, 9999);

-- ---------------------------------------------------------------------------
-- TB_TITULARIDADE — Vínculos autor/editor ↔ obra
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_TITULARIDADE (CD_OBRA, CD_TITULAR, NR_CATEGORIA, VL_PERCENTUAL) VALUES
-- Canção do Amanhecer: 2 autores (50/50) + editor
(5001, 1001, 1, 50.0000),   -- Carlos (Autor 50%)
(5001, 1002, 1, 50.0000),   -- Maria (Autor 50%)
-- Ritmo da Cidade: 1 autor + 1 editor
(5002, 1003, 1, 100.0000),  -- João (Autor 100%)
-- Saudade Eterna: 1 autor
(5003, 1001, 1, 60.0000),   -- Carlos (Autor 60%)
(5003, 1004, 1, 40.0000),   -- Ana (Autor 40%)
-- Noite de Verão: 2 autores + editor
(5004, 1002, 1, 50.0000),   -- Maria (Autor 50%)
(5004, 1003, 1, 50.0000),   -- João (Autor 50%)
-- Pot-Pourri: 1 autor
(5005, 1005, 1, 100.0000),  -- Roberto (Autor 100%)
-- Asa Branca (domínio público): autor original
(5006, 1005, 1, 100.0000);  -- Roberto (Autor placeholder)

-- ---------------------------------------------------------------------------
-- TB_FONOGRAMA — Fonogramas (gravações)
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_FONOGRAMA (CD_FONOGRAMA, CD_ISRC, CD_OBRA, NM_PAIS_ORIGEM, DT_GRAVACAO, DT_LANCAMENTO, NR_STATUS, NM_OBRA) VALUES
(10001, 'BRAB31900001', 5001, 'Brasil', '2023-03-15', '2023-06-01', 3, 'Canção do Amanhecer'),
(10002, 'BRAB31900002', 5001, 'Brasil', '2023-08-20', '2023-12-01', 3, 'Canção do Amanhecer'),
(10003, 'BRAB31900003', 5002, 'Brasil', '2024-01-10', '2024-04-15', 3, 'Ritmo da Cidade'),
(10004, 'BRAB31900004', 5004, 'Brasil', '2022-11-05', '2023-02-28', 3, 'Noite de Verão'),
(10005, 'BRAB31900005', 5005, 'Brasil', '2024-06-01', NULL,         1, 'Pot-Pourri Sertanejo'),
(10006, 'BRAB31900006', 5006, 'Brasil', '1970-01-01', '1970-06-15', 3, 'Asa Branca'),
(10007, 'BRAB31900007', 5006, 'Brasil', '1995-05-20', '1995-09-01', 3, 'Asa Branca'),
(10008, 'BRAB31900008', 5006, 'Brasil', '2020-12-10', '2021-03-01', 3, 'Asa Branca');

-- ---------------------------------------------------------------------------
-- TB_PARTICIPACAO — Participações conexas
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_PARTICIPACAO (CD_FONOGRAMA, CD_TITULAR, NR_CATEGORIA, VL_PERCENTUAL) VALUES
-- Fonograma 10001: intérprete + produtor + músico
(10001, 1006, 1, 43.7000),   -- Fernanda (Intérprete)
(10001, 1010, 2, 41.7000),   -- Produções Harmonia (Produtor)
(10001, 1008, 3, 14.6000),   -- Paulo (Músico)
-- Fonograma 10002: intérprete + produtor (sem músico)
(10002, 1007, 1, 50.0000),   -- Ricardo (Intérprete)
(10002, 1010, 2, 50.0000),   -- Produções Harmonia (Produtor)
-- Fonograma 10003: intérprete + produtor + 2 músicos
(10003, 1006, 1, 43.7000),   -- Fernanda (Intérprete)
(10003, 1009, 2, 41.7000),   -- Editora Sol (Produtor)
(10003, 1008, 3, 7.3000),    -- Paulo (Músico 1)
(10003, 1004, 3, 7.3000),    -- Ana (Músico 2)
-- Fonograma 10004: intérprete + produtor
(10004, 1007, 1, 50.0000),   -- Ricardo (Intérprete)
(10004, 1010, 2, 50.0000),   -- Produções Harmonia (Produtor)
-- Fonograma 10006: intérprete + produtor (Asa Branca original)
(10006, 1006, 1, 50.0000),   -- Fernanda (Intérprete)
(10006, 1009, 2, 50.0000),   -- Editora Sol (Produtor)
-- Fonograma 10007: intérprete + produtor (Asa Branca regravação)
(10007, 1007, 1, 50.0000),   -- Ricardo (Intérprete)
(10007, 1010, 2, 50.0000),   -- Produções Harmonia (Produtor)
-- Fonograma 10008: intérprete + produtor + músico (Asa Branca moderna)
(10008, 1006, 1, 43.7000),   -- Fernanda (Intérprete)
(10008, 1010, 2, 41.7000),   -- Produções Harmonia (Produtor)
(10008, 1008, 3, 14.6000);   -- Paulo (Músico)

-- ---------------------------------------------------------------------------
-- TB_HISTORICO_BLOQUEIO — Alguns registros de auditoria
-- ---------------------------------------------------------------------------
INSERT INTO ecad_legado.TB_HISTORICO_BLOQUEIO (CD_HISTORICO, NR_TIPO_ENTIDADE, CD_ENTIDADE, NR_ACAO, DS_JUSTIFICATIVA, DT_OCORRENCIA) VALUES
(1, 1, 5003, 1, 'Pendência documental do autor', '2024-01-15'),
(2, 2, 10005, 1, 'ISRC em validação pela IFPI', '2024-06-10');
