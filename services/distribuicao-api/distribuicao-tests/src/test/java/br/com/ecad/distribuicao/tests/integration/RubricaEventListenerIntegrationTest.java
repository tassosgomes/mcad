package br.com.ecad.distribuicao.tests.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.infra.persistence.SpringDataRubricaRepository;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
        classes = DistribuicaoApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
            "app.security.auth-enabled=false",
            "spring.rabbitmq.listener.simple.missing-queues-fatal=false"
        })
@Testcontainers
@SuppressWarnings("null")
class RubricaEventListenerIntegrationTest {

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

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private SpringDataRubricaRepository springDataRubricaRepository;

    @MockBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        springDataRubricaRepository.deleteAll();
    }

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

    @Test
    void devePersistirRubricaAoReceberEventoCriada() {
        rabbitTemplate.send("arrecadacao.events", "arrecadacao.rubrica.criada", criarMensagem("""
            {
              "specversion": "1.0",
              "id": "evt-1",
              "source": "urn:arrecadacao-api",
              "type": "arrecadacao.rubrica.criada",
              "subject": "RADIO",
              "time": "2026-04-08T10:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "sigla": "RADIO",
                "nome": "Rádio AM/FM",
                "exigeClassificacao": false
              }
            }
            """));

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            var rubrica = springDataRubricaRepository.findBySigla("RADIO");
            assertThat(rubrica).isPresent();
            assertThat(rubrica.get().getNome()).isEqualTo("Rádio AM/FM");
        });
    }

    @Test
    void deveDescartarEventoComPayloadInvalidoSemPersistirRegistro() {
        rabbitTemplate.send("arrecadacao.events", "arrecadacao.rubrica.criada", criarMensagem("""
            {
              "specversion": "1.0",
              "id": "evt-2",
              "source": "urn:arrecadacao-api",
              "type": "arrecadacao.rubrica.criada",
              "subject": "INVALIDO",
              "time": "2026-04-08T10:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "nome": "Rubrica inválida",
                "exigeClassificacao": false
              }
            }
            """));

        await().during(Duration.ofSeconds(2)).atMost(Duration.ofSeconds(3)).untilAsserted(() ->
                assertThat(springDataRubricaRepository.findAll()).isEmpty());
    }

    @Test
    void deveManterIdempotenciaQuandoEventoDuplicadoEhRecebido() {
        Message message = criarMensagem("""
            {
              "specversion": "1.0",
              "id": "evt-3",
              "source": "urn:arrecadacao-api",
              "type": "arrecadacao.rubrica.criada",
              "subject": "SHOW",
              "time": "2026-04-08T10:00:00Z",
              "datacontenttype": "application/json",
              "data": {
                "sigla": "SHOW",
                "nome": "Show",
                "exigeClassificacao": false
              }
            }
            """);

        rabbitTemplate.send("arrecadacao.events", "arrecadacao.rubrica.criada", message);
        rabbitTemplate.send("arrecadacao.events", "arrecadacao.rubrica.criada", message);

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            assertThat(springDataRubricaRepository.findAll()).hasSize(1);
            assertThat(springDataRubricaRepository.findBySigla("SHOW")).isPresent();
        });
    }

    private Message criarMensagem(String body) {
        MessageProperties properties = new MessageProperties();
        properties.setContentType("application/cloudevents+json");
        return new Message(body.getBytes(), properties);
    }
}
