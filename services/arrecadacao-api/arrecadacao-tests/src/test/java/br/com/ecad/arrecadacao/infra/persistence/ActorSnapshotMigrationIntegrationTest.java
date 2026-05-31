package br.com.ecad.arrecadacao.infra.persistence;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class ActorSnapshotMigrationIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("gestauto")
            .withPassword("gestauto123");

    @Test
    void migrateFromCleanDatabase_ShouldCreateNullableActorSnapshotColumnsAndIndexes() {
        // Arrange
        Flyway flyway = flyway(null);
        flyway.clean();

        // Act
        flyway.migrate();
        JdbcTemplate jdbcTemplate = jdbcTemplate();

        // Assert
        assertThat(columnNullable(jdbcTemplate, "historico_status_licenca", "ator_subject")).isEqualTo("YES");
        assertThat(columnNullable(jdbcTemplate, "historico_status_licenca", "autor_rotulo")).isEqualTo("YES");
        assertThat(columnNullable(jdbcTemplate, "historico_status_usuario", "ator_subject")).isEqualTo("YES");
        assertThat(columnNullable(jdbcTemplate, "historico_status_usuario", "autor_rotulo")).isEqualTo("YES");
        assertThat(columnNullable(jdbcTemplate, "uda_valor", "criado_por_subject")).isEqualTo("YES");
        assertThat(columnNullable(jdbcTemplate, "uda_valor", "criado_por_rotulo")).isEqualTo("YES");
        assertThat(columnNullable(jdbcTemplate, "pagamento", "estornado_por_subject")).isEqualTo("YES");
        assertThat(columnNullable(jdbcTemplate, "pagamento", "estornado_por_rotulo")).isEqualTo("YES");

        assertThat(indexExists(jdbcTemplate, "ix_hist_licenca_ator_subject")).isTrue();
        assertThat(indexExists(jdbcTemplate, "ix_hist_usuario_ator_subject")).isTrue();
        assertThat(indexExists(jdbcTemplate, "ix_uda_valor_criado_por_subject")).isTrue();
        assertThat(indexExists(jdbcTemplate, "ix_pagamento_estornado_por_subject")).isTrue();
    }

    @Test
    void migrateFromExistingData_ShouldKeepLegacyActorFieldsUnchangedAndNewColumnsNull() {
        // Arrange
        Flyway beforeV14 = flyway("13");
        beforeV14.clean();
        beforeV14.migrate();
        JdbcTemplate jdbcTemplate = jdbcTemplate();
        LegacyIds ids = seedLegacyData(jdbcTemplate);

        // Act
        flyway(null).migrate();

        // Assert
        assertThat(jdbcTemplate.queryForObject(
                "SELECT autor FROM arrecadacao.historico_status_licenca WHERE id = ?",
                String.class,
                ids.historicoLicencaId()))
                .isEqualTo("legacy-licenca");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT ator_subject IS NULL AND autor_rotulo IS NULL FROM arrecadacao.historico_status_licenca WHERE id = ?",
                Boolean.class,
                ids.historicoLicencaId()))
                .isTrue();

        assertThat(jdbcTemplate.queryForObject(
                "SELECT autor FROM arrecadacao.historico_status_usuario WHERE id = ?",
                String.class,
                ids.historicoUsuarioId()))
                .isEqualTo("legacy-usuario");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT ator_subject IS NULL AND autor_rotulo IS NULL FROM arrecadacao.historico_status_usuario WHERE id = ?",
                Boolean.class,
                ids.historicoUsuarioId()))
                .isTrue();

        assertThat(jdbcTemplate.queryForObject(
                "SELECT criado_por FROM arrecadacao.uda_valor WHERE id = ?",
                String.class,
                ids.udaId()))
                .isEqualTo("legacy-uda");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT criado_por_subject IS NULL AND criado_por_rotulo IS NULL FROM arrecadacao.uda_valor WHERE id = ?",
                Boolean.class,
                ids.udaId()))
                .isTrue();

        assertThat(jdbcTemplate.queryForObject(
                "SELECT estornado_por FROM arrecadacao.pagamento WHERE id = ?",
                String.class,
                ids.pagamentoId()))
                .isEqualTo("legacy-estorno");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT estornado_por_subject IS NULL AND estornado_por_rotulo IS NULL FROM arrecadacao.pagamento WHERE id = ?",
                Boolean.class,
                ids.pagamentoId()))
                .isTrue();
    }

    private LegacyIds seedLegacyData(JdbcTemplate jdbcTemplate) {
        UUID rubricaId = UUID.randomUUID();
        UUID usuarioId = UUID.randomUUID();
        UUID licencaId = UUID.randomUUID();
        UUID historicoLicencaId = UUID.randomUUID();
        UUID historicoUsuarioId = UUID.randomUUID();
        UUID udaId = UUID.randomUUID();
        UUID pagamentoId = UUID.randomUUID();

        jdbcTemplate.update("""
                INSERT INTO arrecadacao.rubricas (id, sigla, nome, exige_classificacao)
                VALUES (?, 'MIG', 'Rubrica Migration', false)
                """, rubricaId);
        jdbcTemplate.update("""
                INSERT INTO arrecadacao.usuarios_musica (
                    id, razao_social, nome_fantasia, cnpj, cep, logradouro, numero, bairro,
                    cidade, uf, nome_responsavel, status
                )
                VALUES (?, 'Empresa Migration', 'Fantasia', '95917128000120', '12345678',
                    'Rua Teste', '1', 'Bairro', 'Cidade', 'SP', 'Responsavel', 'ATIVO')
                """, usuarioId);
        jdbcTemplate.update("""
                INSERT INTO arrecadacao.licencas (
                    id, usuario_musica_id, rubrica_id, data_inicio, status
                )
                VALUES (?, ?, ?, CURRENT_DATE, 'ATIVA')
                """, licencaId, usuarioId, rubricaId);
        jdbcTemplate.update("""
                INSERT INTO arrecadacao.historico_status_licenca (
                    id, licenca_id, status_anterior, status_novo, justificativa, autor
                )
                VALUES (?, ?, NULL, 'ATIVA', 'Licenca criada', 'legacy-licenca')
                """, historicoLicencaId, licencaId);
        jdbcTemplate.update("""
                INSERT INTO arrecadacao.historico_status_usuario (
                    id, usuario_musica_id, status_anterior, status_novo, justificativa, autor
                )
                VALUES (?, ?, NULL, 'ATIVO', 'Usuario criado', 'legacy-usuario')
                """, historicoUsuarioId, usuarioId);
        jdbcTemplate.update("""
                INSERT INTO arrecadacao.uda_valor (id, valor, data_vigencia, criado_por)
                VALUES (?, 120.000000, CURRENT_DATE, 'legacy-uda')
                """, udaId);
        jdbcTemplate.update("""
                INSERT INTO arrecadacao.pagamento (
                    id, licenca_id, quantidade_udas, valor_uda_no_momento, valor_bruto,
                    periodo, status, justificativa_estorno, estornado_por, estornado_em
                )
                VALUES (?, ?, 1.000000, 120.000000, 120.000000, '2026-05', 'ESTORNADO',
                    'Estorno legado', 'legacy-estorno', NOW())
                """, pagamentoId, licencaId);

        return new LegacyIds(historicoLicencaId, historicoUsuarioId, udaId, pagamentoId);
    }

    private Flyway flyway(String target) {
        FluentConfiguration configuration = Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .schemas("arrecadacao")
                .defaultSchema("arrecadacao")
                .createSchemas(true)
                .cleanDisabled(false);

        if (target != null) {
            configuration.target(target);
        }

        return configuration.load();
    }

    private JdbcTemplate jdbcTemplate() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                postgres.getJdbcUrl(),
                postgres.getUsername(),
                postgres.getPassword());
        return new JdbcTemplate(dataSource);
    }

    private String columnNullable(JdbcTemplate jdbcTemplate, String tableName, String columnName) {
        return jdbcTemplate.queryForObject("""
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'arrecadacao'
                  AND table_name = ?
                  AND column_name = ?
                """, String.class, tableName, columnName);
    }

    private boolean indexExists(JdbcTemplate jdbcTemplate, String indexName) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT to_regclass(?) IS NOT NULL",
                Boolean.class,
                "arrecadacao." + indexName));
    }

    private record LegacyIds(
            UUID historicoLicencaId,
            UUID historicoUsuarioId,
            UUID udaId,
            UUID pagamentoId
    ) {}
}
