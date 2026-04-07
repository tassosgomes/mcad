package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.domain.entities.OutboxEvent;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
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
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
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
    void shouldApplyFlywayMigrationsAndSeedRubricas() {
        Integer migrationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM arrecadacao.flyway_schema_history WHERE success = true",
                Integer.class);
        Integer rubricaCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM arrecadacao.rubricas",
                Integer.class);

        assertThat(migrationCount).isGreaterThanOrEqualTo(2);
        assertThat(rubricaCount).isEqualTo(7);
    }

    @Test
    void findAllShouldReturnSevenRubricasWithExpectedData() {
        List<Rubrica> rubricas = rubricaRepository.findAll();
        Map<String, Rubrica> rubricasPorSigla = rubricas.stream()
                .collect(Collectors.toMap(Rubrica::getSigla, rubrica -> rubrica));

        assertThat(rubricas).hasSize(7);
        assertThat(rubricasPorSigla).containsOnlyKeys(
                "RADIO",
                "TV_ABERTA",
                "TV_FECHADA",
                "CINEMA",
                "VOD",
                "STREAMING_AUDIO",
                "SHOW");
        assertThat(rubricasPorSigla.get("RADIO").getNome()).isEqualTo("Rádio AM/FM");
        assertThat(rubricasPorSigla.get("TV_ABERTA").isExigeClassificacao()).isTrue();
        assertThat(rubricasPorSigla.get("STREAMING_AUDIO").isExigeClassificacao()).isFalse();
    }

    @Test
    void findBySiglaShouldReturnRubricaWhenItExists() {
        Optional<Rubrica> rubrica = rubricaRepository.findBySigla("TV_ABERTA");

        assertThat(rubrica).isPresent();
        assertThat(rubrica.orElseThrow().getNome()).isEqualTo("TV Aberta");
        assertThat(rubrica.orElseThrow().isExigeClassificacao()).isTrue();
    }

    @Test
    void findBySiglaShouldReturnEmptyWhenRubricaDoesNotExist() {
        assertThat(rubricaRepository.findBySigla("INEXISTENTE")).isEmpty();
    }

    @Test
    void seedMigrationShouldBeIdempotent() throws IOException {
        jdbcTemplate.execute(loadMigration("db/migration/V2__seed_rubricas.sql"));

        Integer rubricaCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM arrecadacao.rubricas",
                Integer.class);

        assertThat(rubricaCount).isEqualTo(7);
    }

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
