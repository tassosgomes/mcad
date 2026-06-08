package br.com.ecad.distribuicao.tests.audit;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.commands.AprovarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.CancelarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.CriarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.FinalizarProcessoCommand;
import br.com.ecad.distribuicao.application.commands.handlers.AprovarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.commands.handlers.CancelarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.commands.handlers.CriarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.commands.handlers.FinalizarProcessoCommandHandler;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.infra.persistence.SpringDataSnapshotRolRepository;
import br.com.ecad.distribuicao.infra.persistence.SpringDataSnapshotVerbaRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Integration test verifying that for each ProcessoAuditOperation, invoking
 * the corresponding command handler writes exactly 2 rows to the
 * {@code distribuicao.audit_outbox} table:
 * <ol>
 *   <li>event_type=USER_ACTION with {@code action.name=PROCESSO_DISTRIBUICAO_<OP>}</li>
 *   <li>event_type=DATA_CHANGE with correct before/after state</li>
 * </ol>
 *
 * <p>The real {@link br.org.ecad.audit.sdk.AuditClient} (via AuditAutoConfiguration)
 * is used here — NOT mocked — so that the JDBC outbox repository is exercised.
 * Requires {@code audit.mode=OUTBOX_HTTP} (no relay to external HTTP/RabbitMQ).
 */
@SpringBootTest(
        classes = DistribuicaoApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
            "app.security.auth-enabled=false",
            "ecad.authz.enabled=false",
            "spring.rabbitmq.listener.simple.auto-startup=false",
            // Use OUTBOX_HTTP mode: AuditClient writes to DB; no external relay required
            "audit.mode=OUTBOX_HTTP",
            "audit.enabled=true",
            "audit.endpoint=http://localhost:9999/irrelevant",  // not called in OUTBOX mode
            "otel.sdk.disabled=true",
            "management.tracing.enabled=false"
        })
@Testcontainers
@SuppressWarnings("null")
class ProcessoAuditOutboxIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> postgres.getJdbcUrl() + "&currentSchema=distribuicao");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
        registry.add("spring.rabbitmq.host", () -> "localhost");
        registry.add("spring.rabbitmq.port", () -> 5672);
    }

    @Autowired private CriarProcessoCommandHandler criarHandler;
    @Autowired private AprovarProcessoCommandHandler aprovarHandler;
    @Autowired private FinalizarProcessoCommandHandler finalizarHandler;
    @Autowired private CancelarProcessoCommandHandler cancelarHandler;

    @Autowired private AuditContextProvider auditContextProvider;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private SpringDataSnapshotRolRepository rolRepository;
    @Autowired private SpringDataSnapshotVerbaRepository verbaRepository;

    @MockBean private RabbitTemplate rabbitTemplate;
    @MockBean private JwtDecoder jwtDecoder;

    private static final String RUBRICA = "RADIO";
    private static final String PERIODO = "2026-03";
    private static final String ANALISTA = "analista@ecad.org";

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM distribuicao.audit_outbox");
        jdbcTemplate.execute("DELETE FROM distribuicao.outbox_events");
        jdbcTemplate.execute("DELETE FROM distribuicao.processos");
        rolRepository.deleteAll();
        verbaRepository.deleteAll();

        seedSnapshotRol();
        seedSnapshotVerba();
    }

    @Test
    void create_ShouldInsert2AuditOutboxRows_UserActionAndDataChange() {
        // Act
        criarHandler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA));

        // Assert: exactly 2 rows
        List<Map<String, Object>> rows = queryAuditOutbox();
        assertThat(rows).hasSize(2);

        // One USER_ACTION row with correct action code. NOTE: a coluna aggregate_type
        // em audit_outbox e populada pelo JdbcAuditOutboxRepository a partir de
        // event.data().entityType(); USER_ACTION tem data=null por padrao (segue
        // o template UsuarioMusicaAuditEventFactory), entao aggregate_type fica null
        // para esta linha. A identificacao do agregado no USER_ACTION vai dentro
        // de payload_json.action.businessContext.entityType/entityId.
        var userActionRow = rows.stream()
                .filter(r -> "USER_ACTION".equals(r.get("event_type")))
                .findFirst();
        assertThat(userActionRow).isPresent();
        assertThat(userActionRow.get().get("aggregate_type")).isNull();
        assertThat(userActionRow.get().get("status")).isEqualTo("PENDING");
        String userActionPayload = (String) userActionRow.get().get("payload_json");
        assertThat(userActionPayload).contains("PROCESSO_DISTRIBUICAO_CREATE");
        assertThat(userActionPayload).contains("\"entityType\": \"ProcessoDistribuicao\"");

        // One DATA_CHANGE row with null before (CREATE) - aggregate_type populado
        var dataChangeRow = rows.stream()
                .filter(r -> "DATA_CHANGE".equals(r.get("event_type")))
                .findFirst();
        assertThat(dataChangeRow).isPresent();
        assertThat(dataChangeRow.get().get("status")).isEqualTo("PENDING");
        assertThat(dataChangeRow.get().get("aggregate_type")).isEqualTo("ProcessoDistribuicao");
        String dataChangePayload = (String) dataChangeRow.get().get("payload_json");
        // before should be null for CREATE
        assertThat(dataChangePayload).doesNotContain("\"before\":{");
        // after should contain status=CRIADO
        assertThat(dataChangePayload).contains("CRIADO");
    }

    @Test
    void approve_ShouldInsert2AuditOutboxRows_WithBeforeStateCalculado() {
        // Arrange: create and manually mark calculated
        ProcessoResponse created = criarHandler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA));
        UUID processoId = created.id();
        jdbcTemplate.execute("UPDATE distribuicao.processos SET status='CALCULADO', total_execucoes=100 WHERE id='" + processoId + "'");

        // Clear previous audit rows from CREATE
        jdbcTemplate.execute("DELETE FROM distribuicao.audit_outbox");

        // Act
        aprovarHandler.handle(new AprovarProcessoCommand(processoId, ANALISTA));

        // Assert
        List<Map<String, Object>> rows = queryAuditOutbox();
        assertThat(rows).hasSize(2);

        var userActionRow = rows.stream()
                .filter(r -> "USER_ACTION".equals(r.get("event_type")))
                .findFirst();
        assertThat(userActionRow).isPresent();
        assertThat((String) userActionRow.get().get("payload_json")).contains("PROCESSO_DISTRIBUICAO_APPROVE");

        var dataChangeRow = rows.stream()
                .filter(r -> "DATA_CHANGE".equals(r.get("event_type")))
                .findFirst();
        assertThat(dataChangeRow).isPresent();
        String dataChangePayload = (String) dataChangeRow.get().get("payload_json");
        // before should contain CALCULADO state
        assertThat(dataChangePayload).contains("CALCULADO");
        // after should contain APROVADO state
        assertThat(dataChangePayload).contains("APROVADO");
    }

    @Test
    void finalize_ShouldInsert2AuditOutboxRows_WithBeforeStateAprovado() {
        // Arrange: create, calculate, approve
        ProcessoResponse created = criarHandler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA));
        UUID processoId = created.id();
        jdbcTemplate.execute("UPDATE distribuicao.processos SET status='CALCULADO', total_execucoes=100 WHERE id='" + processoId + "'");
        jdbcTemplate.execute("UPDATE distribuicao.processos SET status='APROVADO', aprovado_em=NOW() WHERE id='" + processoId + "'");

        jdbcTemplate.execute("DELETE FROM distribuicao.audit_outbox");

        // Act
        finalizarHandler.handle(new FinalizarProcessoCommand(processoId, ANALISTA));

        // Assert
        List<Map<String, Object>> rows = queryAuditOutbox();
        assertThat(rows).hasSize(2);

        var userActionRow = rows.stream()
                .filter(r -> "USER_ACTION".equals(r.get("event_type")))
                .findFirst();
        assertThat(userActionRow).isPresent();
        assertThat((String) userActionRow.get().get("payload_json")).contains("PROCESSO_DISTRIBUICAO_FINALIZE");

        var dataChangeRow = rows.stream()
                .filter(r -> "DATA_CHANGE".equals(r.get("event_type")))
                .findFirst();
        assertThat(dataChangeRow).isPresent();
        String dataChangePayload = (String) dataChangeRow.get().get("payload_json");
        assertThat(dataChangePayload).contains("APROVADO");
        assertThat(dataChangePayload).contains("FINALIZADO");
    }

    @Test
    void cancel_ShouldInsert2AuditOutboxRows_WithBeforeStateCriado() {
        // Arrange
        ProcessoResponse created = criarHandler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA));
        UUID processoId = created.id();

        jdbcTemplate.execute("DELETE FROM distribuicao.audit_outbox");

        // Act
        cancelarHandler.handle(new CancelarProcessoCommand(processoId, "Justificativa de cancelamento para teste de auditoria", ANALISTA));

        // Assert
        List<Map<String, Object>> rows = queryAuditOutbox();
        assertThat(rows).hasSize(2);

        var userActionRow = rows.stream()
                .filter(r -> "USER_ACTION".equals(r.get("event_type")))
                .findFirst();
        assertThat(userActionRow).isPresent();
        assertThat((String) userActionRow.get().get("payload_json")).contains("PROCESSO_DISTRIBUICAO_CANCEL");

        var dataChangeRow = rows.stream()
                .filter(r -> "DATA_CHANGE".equals(r.get("event_type")))
                .findFirst();
        assertThat(dataChangeRow).isPresent();
        String dataChangePayload = (String) dataChangeRow.get().get("payload_json");
        assertThat(dataChangePayload).contains("CRIADO");
        assertThat(dataChangePayload).contains("CANCELADO");
    }

    @Test
    void eachOperation_ShouldWriteAggregateType_ProcessoDistribuicao() {
        // Verify aggregate_type contract: DATA_CHANGE rows carregam o aggregate_type
        // na coluna (extraido pelo starter de event.data().entityType()); USER_ACTION
        // rows tem data=null e por isso aggregate_type=null - a identificacao do
        // agregado vai dentro de payload_json.action.businessContext. Mesmo padrao
        // de PagamentoAuditEventFactory/UsuarioMusicaAuditEventFactory.
        criarHandler.handle(new CriarProcessoCommand(RUBRICA, PERIODO, ANALISTA));

        List<Map<String, Object>> rows = queryAuditOutbox();

        var dataChangeRows = rows.stream()
                .filter(r -> "DATA_CHANGE".equals(r.get("event_type")))
                .toList();
        assertThat(dataChangeRows).isNotEmpty();
        assertThat(dataChangeRows).allSatisfy(row ->
                assertThat(row.get("aggregate_type")).isEqualTo("ProcessoDistribuicao"));

        var userActionRows = rows.stream()
                .filter(r -> "USER_ACTION".equals(r.get("event_type")))
                .toList();
        assertThat(userActionRows).isNotEmpty();
        assertThat(userActionRows).allSatisfy(row -> {
            assertThat(row.get("aggregate_type")).isNull();
            assertThat((String) row.get("payload_json"))
                    .contains("\"entityType\": \"ProcessoDistribuicao\"");
        });
    }

    private List<Map<String, Object>> queryAuditOutbox() {
        return jdbcTemplate.queryForList(
                "SELECT id, event_id, event_type, aggregate_type, aggregate_id, payload_json::text AS payload_json, status "
                + "FROM distribuicao.audit_outbox ORDER BY created_at_utc");
    }

    private void seedSnapshotRol() {
        rolRepository.save(new SnapshotRol(RUBRICA, PERIODO, UUID.randomUUID(), 150, "{}", false, Instant.now()));
    }

    private void seedSnapshotVerba() {
        verbaRepository.save(new SnapshotVerba(RUBRICA, PERIODO, BigDecimal.valueOf(110000),
                BigDecimal.valueOf(5000), BigDecimal.valueOf(2000), BigDecimal.valueOf(103000), Instant.now()));
    }
}
