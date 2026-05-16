package br.com.ecad.distribuicao.tests.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.infra.persistence.SpringDataSnapshotRolRepository;
import br.com.ecad.distribuicao.infra.persistence.SpringDataSnapshotVerbaRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Integration test verifying that valid CloudEvents published to RabbitMQ queues
 * are consumed and persisted as SnapshotRol / SnapshotVerba entities.
 * Invalid payloads (missing required fields) must be silently discarded.
 */
@SpringBootTest(
        classes = DistribuicaoApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
            "app.security.auth-enabled=false",
            "spring.autoconfigure.exclude=br.org.ecad.audit.starter.AuditAutoConfiguration",
            "spring.rabbitmq.listener.simple.missing-queues-fatal=false"
        })
@Testcontainers
@SuppressWarnings("null")
class SnapshotEventListenerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("postgres")
            .withPassword("postgres");

    @Container
    static RabbitMQContainer rabbitmq = new RabbitMQContainer("rabbitmq:3.13-management-alpine")
            .withVhost("mcad")
            .withUser("mcad", "mcad")
            .withPermission("mcad", "mcad", ".*", ".*", ".*");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> postgres.getJdbcUrl() + "&currentSchema=distribuicao");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
        registry.add("spring.rabbitmq.host", rabbitmq::getHost);
        registry.add("spring.rabbitmq.port", rabbitmq::getAmqpPort);
        registry.add("spring.rabbitmq.username", () -> "mcad");
        registry.add("spring.rabbitmq.password", () -> "mcad");
        registry.add("spring.rabbitmq.virtual-host", () -> "mcad");
    }

    @Autowired private RabbitTemplate rabbitTemplate;
    @Autowired private SpringDataSnapshotRolRepository rolRepository;
    @Autowired private SpringDataSnapshotVerbaRepository verbaRepository;

    @MockBean private AuditClient auditClient;
    @MockBean private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        rolRepository.deleteAll();
        verbaRepository.deleteAll();
    }

    // ===== ROL EVENT LISTENER TESTS =====

    @Test
    void devePersistirSnapshotRolAoReceberEventoRolFechado() {
        // Send to identificacao.events exchange with routing key identificacao.rol.fechado
        // (bound to distribuicao.rol queue by RabbitMqConfig)
        rabbitTemplate.send("identificacao.events", "identificacao.rol.fechado", cloudEventMessage("""
            {
              "specversion": "1.0",
              "id": "rol-evt-1",
              "source": "urn:identificacao-api",
              "type": "identificacao.rol.fechado",
              "subject": "RADIO/2026-03",
              "time": "2026-03-31T18:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "rubricaSigla": "RADIO",
                "periodo": "2026-03",
                "captacaoId": "00000000-0000-0000-0000-000000000001",
                "totalExecucoes": 150
              }
            }
            """));

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            var rol = rolRepository.findAtivoPorRubricaAndPeriodo("RADIO", "2026-03");
            assertThat(rol).isPresent();
            assertThat(rol.get().getTotalExecucoes()).isEqualTo(150);
            assertThat(rol.get().isCancelado()).isFalse();
        });
    }

    @Test
    void deveDescartarEventoRolSemRubricaSigla() {
        rabbitTemplate.send("identificacao.events", "identificacao.rol.fechado", cloudEventMessage("""
            {
              "specversion": "1.0",
              "id": "rol-evt-invalid-1",
              "source": "urn:identificacao-api",
              "type": "identificacao.rol.fechado",
              "subject": "RADIO/2026-03",
              "time": "2026-03-31T18:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "periodo": "2026-03",
                "captacaoId": "00000000-0000-0000-0000-000000000002",
                "totalExecucoes": 150
              }
            }
            """));

        await().during(Duration.ofSeconds(2)).atMost(Duration.ofSeconds(4)).untilAsserted(() ->
                assertThat(rolRepository.findAll()).isEmpty());
    }

    @Test
    void deveMarcarRolCanceladoAoReceberEventoRolCancelado() {
        // First create a snapshot Rol
        rabbitTemplate.send("identificacao.events", "identificacao.rol.fechado", cloudEventMessage("""
            {
              "specversion": "1.0",
              "id": "rol-evt-2",
              "source": "urn:identificacao-api",
              "type": "identificacao.rol.fechado",
              "subject": "SHOW/2026-04",
              "time": "2026-04-30T18:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "rubricaSigla": "SHOW",
                "periodo": "2026-04",
                "captacaoId": "00000000-0000-0000-0000-000000000003",
                "totalExecucoes": 80
              }
            }
            """));

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(rolRepository.findAll()).hasSize(1));

        // Then cancel it
        rabbitTemplate.send("identificacao.events", "identificacao.rol.cancelado", cloudEventMessage("""
            {
              "specversion": "1.0",
              "id": "rol-evt-cancel-1",
              "source": "urn:identificacao-api",
              "type": "identificacao.rol.cancelado",
              "subject": "SHOW/2026-04",
              "time": "2026-05-01T10:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "rubricaSigla": "SHOW",
                "periodo": "2026-04"
              }
            }
            """));

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            var allRols = rolRepository.findAll();
            assertThat(allRols).hasSize(1);
            assertThat(allRols.get(0).isCancelado()).isTrue();
        });
    }

    @Test
    void deveManterIdempotenciaRolFechadoDuplicado() {
        Message message = cloudEventMessage("""
            {
              "specversion": "1.0",
              "id": "rol-evt-idem-1",
              "source": "urn:identificacao-api",
              "type": "identificacao.rol.fechado",
              "subject": "TV/2026-05",
              "time": "2026-05-31T18:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "rubricaSigla": "TV",
                "periodo": "2026-05",
                "captacaoId": "00000000-0000-0000-0000-000000000004",
                "totalExecucoes": 200
              }
            }
            """);

        rabbitTemplate.send("identificacao.events", "identificacao.rol.fechado", message);
        rabbitTemplate.send("identificacao.events", "identificacao.rol.fechado", message);

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(rolRepository.findAll()).hasSize(1));
    }

    // ===== VERBA EVENT LISTENER TESTS =====

    @Test
    void devePersistirSnapshotVerbaAoReceberEventoVerbaDisponivel() {
        rabbitTemplate.send("arrecadacao.events", "arrecadacao.verba.disponivel", cloudEventMessage("""
            {
              "specversion": "1.0",
              "id": "verba-evt-1",
              "source": "urn:arrecadacao-api",
              "type": "arrecadacao.verba.disponivel",
              "subject": "RADIO/2026-03",
              "time": "2026-04-01T10:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "rubricaSigla": "RADIO",
                "periodo": "2026-03",
                "valorBruto": "110000.00",
                "deducaoEcad": "5000.00",
                "deducaoAssociacoes": "2000.00",
                "verbaLiquida": "103000.00"
              }
            }
            """));

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            var verbas = verbaRepository.findAll();
            assertThat(verbas).hasSize(1);
            var verba = verbas.get(0);
            assertThat(verba.getRubricaSigla()).isEqualTo("RADIO");
            assertThat(verba.getPeriodo()).isEqualTo("2026-03");
            assertThat(verba.getVerbaLiquida()).isEqualByComparingTo("103000.00");
        });
    }

    @Test
    void deveDescartarEventoVerbaSemVerbaLiquida() {
        rabbitTemplate.send("arrecadacao.events", "arrecadacao.verba.disponivel", cloudEventMessage("""
            {
              "specversion": "1.0",
              "id": "verba-evt-invalid-1",
              "source": "urn:arrecadacao-api",
              "type": "arrecadacao.verba.disponivel",
              "subject": "RADIO/2026-03",
              "time": "2026-04-01T10:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "rubricaSigla": "RADIO",
                "periodo": "2026-03",
                "valorBruto": "110000.00"
              }
            }
            """));

        await().during(Duration.ofSeconds(2)).atMost(Duration.ofSeconds(4)).untilAsserted(() ->
                assertThat(verbaRepository.findAll()).isEmpty());
    }

    private Message cloudEventMessage(String body) {
        MessageProperties properties = new MessageProperties();
        properties.setContentType("application/cloudevents+json");
        return new Message(body.getBytes(), properties);
    }
}
