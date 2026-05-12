package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.infra.events.DistribuicaoProcessoEventListener;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import io.cloudevents.core.format.EventFormat;
import io.cloudevents.core.provider.EventFormatProvider;
import io.cloudevents.jackson.JsonFormat;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * IT do consumer {@link DistribuicaoProcessoEventListener} (HU-05, task 9.6).
 *
 * <p>Testa o listener chamando-o diretamente com mensagens CloudEvent construídas
 * (mesma abordagem do teste unitário, mas com banco real via PostgreSQL do docker-compose.dev.yml).
 * Não usa Testcontainers RabbitMQ pois o RabbitMQ não é necessário para testar o listener
 * diretamente — o listener recebe um {@code Message} AMQP e processa sincronamente.</p>
 *
 * <p>Importa {@link VerbaServiceTestConfig} para evitar conflito de beans com
 * {@code VerbaServiceImpl}, já que este IT não exercita o cálculo de verba.</p>
 *
 * <p>Cenários cobertos:
 * <ul>
 *   <li>processo.iniciado → verba muda para EM_DISTRIBUICAO</li>
 *   <li>processo.finalizado → verba muda para DISTRIBUIDA</li>
 *   <li>rubricaSigla inexistente → log warn + sem alteração</li>
 *   <li>tipo de evento desconhecido → ignorado sem alteração</li>
 * </ul>
 * </p>
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@Transactional
@SuppressWarnings("null")
class DistribuicaoProcessoEventListenerIT {

    private static final EventFormat JSON_FORMAT =
            EventFormatProvider.getInstance().resolveFormat(JsonFormat.CONTENT_TYPE);

    @Autowired
    private DistribuicaoProcessoEventListener listener;

    @Autowired
    private VerbaRepository verbaRepository;

    @Autowired
    private SpringDataRubricaRepository rubricaRepository;

    @Autowired
    private EntityManager entityManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Rubrica rubrica;
    private UUID rubricaId;
    private String rubricaSigla;
    private static final String PERIODO = "2026-04";

    @BeforeEach
    void setUp() {
        rubricaSigla = "DPL_" + UUID.randomUUID().toString().substring(0, 4);
        rubrica = new Rubrica(UUID.randomUUID(), rubricaSigla, "Rubrica Listener IT", false);
        rubricaRepository.saveAndFlush(rubrica);
        rubricaId = rubrica.getId();
    }

    // ── Cenário 1: processo.iniciado → EM_DISTRIBUICAO ───────────────────────────

    @Test
    void onMessage_ProcessoIniciado_DeveAplicarLockNaVerba() {
        // Arrange — verba ABERTA com valor
        Verba verba = Verba.abrir(rubricaId, PERIODO);
        verba.recalcular(new BigDecimal("1000.00"), 5);
        verbaRepository.save(verba);
        entityManager.flush();
        entityManager.clear();

        // Act — processar evento diretamente (sem passar pelo broker)
        Message message = buildCloudEventMessage("distribuicao.processo.iniciado", rubricaSigla, PERIODO);
        listener.onMessage(message);

        // Assert
        entityManager.flush();
        entityManager.clear();
        var verbaAtualizada = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, PERIODO);
        assertThat(verbaAtualizada).isPresent();
        assertThat(verbaAtualizada.get().getStatus())
                .as("Status deve ter mudado para EM_DISTRIBUICAO apos evento processo.iniciado")
                .isEqualTo(StatusVerba.EM_DISTRIBUICAO);
    }

    // ── Cenário 2: processo.finalizado → DISTRIBUIDA ──────────────────────────────

    @Test
    void onMessage_ProcessoFinalizado_DeveMarcarDistribuida() {
        // Arrange — verba EM_DISTRIBUICAO (pré-condição obrigatória)
        Verba verba = Verba.abrir(rubricaId, PERIODO);
        verba.recalcular(new BigDecimal("1500.00"), 8);
        verba.marcarEmDistribuicao();
        verbaRepository.save(verba);
        entityManager.flush();
        entityManager.clear();

        // Act
        Message message = buildCloudEventMessage("distribuicao.processo.finalizado", rubricaSigla, PERIODO);
        listener.onMessage(message);

        // Assert
        entityManager.flush();
        entityManager.clear();
        var verbaAtualizada = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, PERIODO);
        assertThat(verbaAtualizada).isPresent();
        assertThat(verbaAtualizada.get().getStatus())
                .as("Status deve ter mudado para DISTRIBUIDA apos evento processo.finalizado")
                .isEqualTo(StatusVerba.DISTRIBUIDA);
    }

    // ── Cenário 3: rubricaSigla inexistente → log warn + sem alteração ────────────

    @Test
    void onMessage_RubricaDesconhecida_DeveIgnorarSemAlterarVerba() {
        // Arrange — verba ABERTA para uma rubrica conhecida
        Verba verba = Verba.abrir(rubricaId, PERIODO);
        verbaRepository.save(verba);
        entityManager.flush();

        // Act — evento com sigla que não existe no banco
        Message message = buildCloudEventMessage("distribuicao.processo.iniciado", "SIGLA_INEXISTENTE_XYZ", PERIODO);
        listener.onMessage(message); // deve retornar sem lançar excecao

        // Assert — verba da rubrica conhecida permanece ABERTA
        entityManager.flush();
        entityManager.clear();
        var verbaIntacta = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, PERIODO);
        assertThat(verbaIntacta).isPresent();
        assertThat(verbaIntacta.get().getStatus())
                .as("Verba de outra rubrica nao deve ser afetada por evento de sigla desconhecida")
                .isEqualTo(StatusVerba.ABERTA);
    }

    // ── Cenário 4: tipo de evento desconhecido → ignorado sem alteração ───────────

    @Test
    void onMessage_TipoDesconhecido_DeveIgnorar() {
        // Arrange — verba ABERTA
        Verba verba = Verba.abrir(rubricaId, PERIODO);
        verbaRepository.save(verba);
        entityManager.flush();

        // Act — evento com tipo não mapeado
        Message message = buildCloudEventMessage("distribuicao.processo.outro_tipo", rubricaSigla, PERIODO);
        listener.onMessage(message);

        // Assert — verba permanece ABERTA
        entityManager.flush();
        entityManager.clear();
        var verbaIntacta = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, PERIODO);
        assertThat(verbaIntacta).isPresent();
        assertThat(verbaIntacta.get().getStatus())
                .as("Verba nao deve ser alterada por tipo de evento desconhecido")
                .isEqualTo(StatusVerba.ABERTA);
    }

    // ── Cenário 5: verba inexistente para a rubrica+periodo → log warn + no-op ────

    @Test
    void onMessage_ProcessoIniciado_VerbaInexistente_DeveLogWarnENaoFalhar() {
        // Arrange — nenhuma verba para o período especificado

        // Act — deve retornar sem exception mesmo sem verba
        Message message = buildCloudEventMessage("distribuicao.processo.iniciado", rubricaSigla, "2025-12");
        listener.onMessage(message);

        // Assert — nenhuma verba criada (listener não cria verbas, apenas atualiza)
        entityManager.flush();
        var verbaCriada = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, "2025-12");
        assertThat(verbaCriada).isEmpty();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private Message buildCloudEventMessage(String type, String rubricaSigla, String periodo) {
        try {
            Map<String, String> payloadMap = Map.of(
                    "rubricaSigla", rubricaSigla,
                    "periodo", periodo
            );
            byte[] dataBytes = objectMapper.writeValueAsBytes(payloadMap);

            CloudEvent cloudEvent = CloudEventBuilder.v1()
                    .withId(UUID.randomUUID().toString())
                    .withSource(URI.create("urn:distribuicao-api"))
                    .withType(type)
                    .withTime(OffsetDateTime.now())
                    .withDataContentType("application/json")
                    .withData(dataBytes)
                    .build();

            byte[] serialized = JSON_FORMAT.serialize(cloudEvent);

            MessageProperties props = new MessageProperties();
            props.setContentType(JsonFormat.CONTENT_TYPE);
            return new Message(serialized, props);
        } catch (Exception ex) {
            throw new RuntimeException("Falha ao construir mensagem CloudEvent de teste", ex);
        }
    }
}
