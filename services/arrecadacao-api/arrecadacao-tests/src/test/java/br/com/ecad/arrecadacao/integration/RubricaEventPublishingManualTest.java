package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.infra.events.OutboxPublisherWorker;
import br.com.ecad.arrecadacao.infra.events.OutboxSeedService;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataOutboxEventRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

/**
 * Teste que simula o fluxo manual de publicação de evento de rubrica.
 *
 * <p>Cenário: Uma rubrica é inserida no banco após a inicialização (não dispara ApplicationReadyEvent).
 * Este teste valida que:
 * <ul>
 *   <li>1. OutboxSeedService.publishPendingRubricaEvents() pode ser acionado manualmente</li>
 *   <li>2. Evento é criado em outbox_events como PENDENTE</li>
 *   <li>3. OutboxPublisherWorker publica no RabbitMQ</li>
 *   <li>4. Evento é marcado como PUBLICADO</li>
 * </ul>
 * </p>
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class RubricaEventPublishingManualTest {

    @Autowired
    private SpringDataRubricaRepository rubricaRepository;

    @Autowired
    private SpringDataOutboxEventRepository outboxEventRepository;

    @Autowired
    private OutboxSeedService outboxSeedService;

    @Autowired
    private OutboxPublisherWorker outboxPublisherWorker;

    @Autowired
    private PlatformTransactionManager txManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    /**
     * Simula o fluxo completo:
     * 1. Insere rubrica APÓS inicialização (sem disparo de ApplicationReadyEvent)
     * 2. Chama manualmente publishPendingRubricaEvents()
     * 3. Verifica se evento foi criado em outbox_events como PENDENTE
     * 4. Chama publishPendingEvents() para publicar no RabbitMQ
     * 5. Verifica se evento foi marcado como PUBLICADO
     * 6. Valida que RabbitMQ foi chamado
     */
    @Test
    void novaRubricaPosInicializacao_DeveGerarPublicarEvento() {
        // Arrange
        UUID rubricaId = UUID.randomUUID();
        String sigla = "TESTE_POS_INIT_" + System.currentTimeMillis();

        TransactionTemplate tt = new TransactionTemplate(txManager);

        // Act 1 — Inserir rubrica APÓS inicialização
        tt.execute(status -> {
            var rubrica = new Rubrica(rubricaId, sigla, "Rubrica Pós Inicialização", true);
            rubricaRepository.save(rubrica);
            return null;
        });

        // Act 2 — Chamar OutboxSeedService manualmente para criar evento
        outboxSeedService.publishPendingRubricaEvents();

        // Assert 1 — Verificar que evento foi criado como PENDENTE
        tt.execute(status -> {
            var eventos = outboxEventRepository
                    .findAll()
                    .stream()
                    .filter(e -> "arrecadacao.rubrica.criada".equals(e.getType()))
                    .filter(e -> rubricaId.toString().equals(e.getSubject()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver 1 evento para a rubrica criada")
                    .hasSize(1);

            var evento = eventos.get(0);
            assertThat(evento.getPublishedAt())
                    .as("Evento deve estar PENDENTE (published_at IS NULL)")
                    .isNull();

            assertThat(evento.getPayload())
                    .as("Payload deve conter sigla e nome")
                    .contains(sigla, "Rubrica Pós Inicialização");

            return null;
        });

        // Act 3 — Chamar OutboxPublisherWorker para publicar no RabbitMQ
        tt.execute(status -> {
            outboxPublisherWorker.publishPendingEvents();
            return null;
        });

        // Assert 2 — Verificar que evento foi marcado como PUBLICADO
        tt.execute(status -> {
            var eventos = outboxEventRepository
                    .findAll()
                    .stream()
                    .filter(e -> "arrecadacao.rubrica.criada".equals(e.getType()))
                    .filter(e -> rubricaId.toString().equals(e.getSubject()))
                    .toList();

            assertThat(eventos).hasSize(1);

            var evento = eventos.get(0);
            assertThat(evento.getPublishedAt())
                    .as("Evento deve estar PUBLICADO após OutboxPublisherWorker")
                    .isNotNull();

            return null;
        });

        // Assert 3 — Validar que RabbitMQ foi chamado
        verify(rabbitTemplate).send(any());
    }

    /**
     * Testa comportamento de idempotência:
     * Chamar publishPendingRubricaEvents() duas vezes não deve duplicar eventos.
     */
    @Test
    void publicarDuasVezes_NaoDuplicaEventos() {
        // Arrange
        UUID rubricaId = UUID.randomUUID();
        String sigla = "IDEMPOTENCIA_TEST_" + System.currentTimeMillis();

        TransactionTemplate tt = new TransactionTemplate(txManager);

        tt.execute(status -> {
            var rubrica = new Rubrica(rubricaId, sigla, "Teste Idempotência", false);
            rubricaRepository.save(rubrica);
            return null;
        });

        // Act — Chamar duas vezes
        outboxSeedService.publishPendingRubricaEvents();
        int countAposFirstCall = tt.execute(status -> outboxEventRepository
                .findAll()
                .stream()
                .filter(e -> rubricaId.toString().equals(e.getSubject()))
                .toList()
                .size());

        outboxSeedService.publishPendingRubricaEvents();
        int countAposSecondCall = tt.execute(status -> outboxEventRepository
                .findAll()
                .stream()
                .filter(e -> rubricaId.toString().equals(e.getSubject()))
                .toList()
                .size());

        // Assert
        assertThat(countAposFirstCall)
                .as("Primeira chamada deve criar 1 evento")
                .isEqualTo(1);

        assertThat(countAposSecondCall)
                .as("Segunda chamada não deve duplicar (idempotência)")
                .isEqualTo(1);
    }
}
