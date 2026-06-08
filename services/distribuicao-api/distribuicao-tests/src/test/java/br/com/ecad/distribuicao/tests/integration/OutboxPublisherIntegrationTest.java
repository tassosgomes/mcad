package br.com.ecad.distribuicao.tests.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.domain.entities.OutboxEvent;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventRepository;
import br.com.ecad.distribuicao.infra.persistence.SpringDataOutboxEventRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.time.Duration;
import java.util.List;
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
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Integration test verifying that the OutboxPublisherWorker picks up PENDING
 * outbox events from the database and publishes them to RabbitMQ.
 * Uses real Testcontainers for both PostgreSQL and RabbitMQ.
 */
@SpringBootTest(
        classes = DistribuicaoApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
            "app.security.auth-enabled=false",
            "spring.autoconfigure.exclude=br.org.ecad.audit.starter.AuditAutoConfiguration",
            "app.outbox.publisher.poll-interval-ms=500",
            "spring.rabbitmq.listener.simple.missing-queues-fatal=false",
            "otel.sdk.disabled=true",
            "management.tracing.enabled=false"
        })
@Testcontainers
@SuppressWarnings("null")
class OutboxPublisherIntegrationTest {

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

    @Autowired private SpringDataOutboxEventRepository outboxEventRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    @MockBean private AuditClient auditClient;
    @MockBean private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM distribuicao.outbox_events");
    }

    @Test
    void devePublicarEventosPendentesNoRabbitMQ() {
        // Arrange: insert a PENDING outbox event directly via repo
        OutboxEvent event = OutboxEvent.criar(
                "distribuicao.processo.criado",
                UUID.randomUUID().toString(),
                "{\"processoId\":\"test-id\",\"rubricaSigla\":\"RADIO\",\"periodo\":\"2026-03\"}");
        outboxEventRepository.save(event);

        // Assert: event is initially PENDING (publishedAt is null)
        assertThat(outboxEventRepository.findAll()).hasSize(1);
        assertThat(outboxEventRepository.findAll().get(0).getPublishedAt()).isNull();

        // Wait for publisher worker to run (poll-interval-ms=500)
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            var events = outboxEventRepository.findAll();
            assertThat(events).hasSize(1);
            // After publication, publishedAt should be set
            assertThat(events.get(0).getPublishedAt()).isNotNull();
        });
    }

    @Test
    void devePublicarMultiplosEventosPendentes() {
        // Arrange: insert multiple events
        for (int i = 0; i < 3; i++) {
            OutboxEvent event = OutboxEvent.criar(
                    "distribuicao.processo.criado",
                    UUID.randomUUID().toString(),
                    "{\"index\":" + i + "}");
            outboxEventRepository.save(event);
        }

        assertThat(outboxEventRepository.findAll()).hasSize(3);

        // Wait for all to be published
        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> {
            List<OutboxEvent> events = outboxEventRepository.findAll();
            long publishedCount = events.stream()
                    .filter(e -> e.getPublishedAt() != null)
                    .count();
            assertThat(publishedCount).isEqualTo(3);
        });
    }

    @Test
    void deveNaoReprocessarEventosJaPublicados() {
        // Arrange: insert and wait for publication
        OutboxEvent event = OutboxEvent.criar(
                "distribuicao.processo.aprovado",
                UUID.randomUUID().toString(),
                "{\"processoId\":\"test-id-2\"}");
        outboxEventRepository.save(event);

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(outboxEventRepository.findAll().get(0).getPublishedAt()).isNotNull());

        // Record the published timestamp
        var publishedAt = outboxEventRepository.findAll().get(0).getPublishedAt();

        // Wait a bit and verify the publishedAt timestamp hasn't changed
        // (i.e., the event was not re-processed)
        try {
            Thread.sleep(1500);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }

        var currentEvents = outboxEventRepository.findAll();
        assertThat(currentEvents).hasSize(1);
        assertThat(currentEvents.get(0).getPublishedAt()).isEqualTo(publishedAt);
    }
}
