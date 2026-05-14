package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.domain.entities.OutboxEvent;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@SuppressWarnings("null")
class RubricaPersistenceIntegrationTest {

    @Autowired
    private RubricaRepository rubricaRepository;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private OutboxEventWriter outboxEventWriter;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldCreatePartialIndexForPendingOutboxEvents() {
        String definition = jdbcTemplate.queryForObject(
                """
                SELECT indexdef
                FROM pg_indexes
                WHERE schemaname = 'arrecadacao'
                  AND tablename = 'outbox_events'
                  AND indexname = 'ix_outbox_events_pending'
                """,
                String.class);

        assertThat(definition).contains("WHERE ((published_at IS NULL) AND (attempts < 10))");
    }

    @Test
    void outboxRepositoryShouldSupportWriteAndPendingQueries() {
        outboxEventWriter.addEvent("arrecadacao.rubrica.criada", "rubrica-1", Map.of("sigla", "RADIO"));

        assertThat(outboxEventRepository.existsByTypeAndSubject("arrecadacao.rubrica.criada", "rubrica-1"))
                .isTrue();

        List<OutboxEvent> pendingEvents = outboxEventRepository.findPending(10);

        assertThat(pendingEvents)
                .extracting(OutboxEvent::getSubject)
                .contains("rubrica-1");
    }

    private String loadMigration(String path) throws IOException {
        return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
    }
}
