-- =============================================================================
-- Habilita CDC (Debezium) no PostgreSQL Source
-- Requer wal_level=logical (configurado no docker-compose command)
-- =============================================================================

-- Cria publication para todas as tabelas do schema ecad_legado
-- Debezium usa isso para filtrar quais tabelas monitorar via WAL

ALTER TABLE ecad_legado.TB_DOMINIO REPLICA IDENTITY FULL;
ALTER TABLE ecad_legado.TB_ASSOCIACAO REPLICA IDENTITY FULL;
ALTER TABLE ecad_legado.TB_TITULAR REPLICA IDENTITY FULL;
ALTER TABLE ecad_legado.TB_OBRA REPLICA IDENTITY FULL;
ALTER TABLE ecad_legado.TB_TITULARIDADE REPLICA IDENTITY FULL;
ALTER TABLE ecad_legado.TB_FONOGRAMA REPLICA IDENTITY FULL;
ALTER TABLE ecad_legado.TB_PARTICIPACAO REPLICA IDENTITY FULL;
ALTER TABLE ecad_legado.TB_HISTORICO_BLOQUEIO REPLICA IDENTITY FULL;

-- Publication que o Debezium vai usar
CREATE PUBLICATION ecad_cdc_pub FOR TABLE
    ecad_legado.TB_ASSOCIACAO,
    ecad_legado.TB_TITULAR,
    ecad_legado.TB_OBRA,
    ecad_legado.TB_TITULARIDADE,
    ecad_legado.TB_FONOGRAMA,
    ecad_legado.TB_PARTICIPACAO,
    ecad_legado.TB_HISTORICO_BLOQUEIO;
