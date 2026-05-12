package br.com.ecad.arrecadacao.infra.events;

import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import io.cloudevents.core.format.EventFormat;
import io.cloudevents.core.provider.EventFormatProvider;
import io.cloudevents.jackson.JsonFormat;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Testes unitários do {@link DistribuicaoProcessoEventListener}.
 *
 * <p>Usa ObjectMapper e SimpleMeterRegistry reais para evitar stubbing complexo de APIs fluentes.
 * CloudEvents são construídos via {@code CloudEventBuilder.v1()} + {@code JsonFormat.serialize()},
 * espelhando a abordagem inversa de {@link RabbitMqPublisher}.</p>
 */
@ExtendWith(MockitoExtension.class)
class DistribuicaoProcessoEventListenerTest {

    private static final EventFormat JSON_FORMAT =
            EventFormatProvider.getInstance().resolveFormat(JsonFormat.CONTENT_TYPE);

    @Mock
    private VerbaRepository verbaRepository;

    @Mock
    private RubricaRepository rubricaRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();

    private DistribuicaoProcessoEventListener listener;

    private static final UUID RUBRICA_ID = UUID.randomUUID();
    private static final String RUBRICA_SIGLA = "RADIO";
    private static final String PERIODO = "2026-04";

    @BeforeEach
    void setUp() {
        listener = new DistribuicaoProcessoEventListener(
                verbaRepository,
                rubricaRepository,
                objectMapper,
                meterRegistry
        );
    }

    // ── Cenário a: processo.iniciado → verba muda para EM_DISTRIBUICAO ──────────

    /**
     * (a) onMessage com tipo distribuicao.processo.iniciado deve chamar marcarEmDistribuicao e save.
     */
    @Test
    void onMessage_ProcessoIniciado_DeveAplicarLock() {
        // Arrange
        Rubrica rubrica = new Rubrica(RUBRICA_ID, RUBRICA_SIGLA, "Radio Comercial", false);
        when(rubricaRepository.findBySigla(RUBRICA_SIGLA)).thenReturn(Optional.of(rubrica));

        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        when(verbaRepository.findByRubricaIdAndPeriodo(RUBRICA_ID, PERIODO)).thenReturn(Optional.of(verba));
        when(verbaRepository.save(any(Verba.class))).thenAnswer(inv -> inv.getArgument(0));

        Message message = buildCloudEventMessage("distribuicao.processo.iniciado", RUBRICA_SIGLA, PERIODO);

        // Act
        listener.onMessage(message);

        // Assert
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.EM_DISTRIBUICAO);
        verify(verbaRepository, times(1)).save(verba);
    }

    // ── Cenário b: processo.finalizado → verba muda para DISTRIBUIDA ─────────────

    /**
     * (b) onMessage com tipo distribuicao.processo.finalizado deve chamar marcarDistribuida e save.
     */
    @Test
    void onMessage_ProcessoFinalizado_DeveMarcarDistribuida() {
        // Arrange
        Rubrica rubrica = new Rubrica(RUBRICA_ID, RUBRICA_SIGLA, "Radio Comercial", false);
        when(rubricaRepository.findBySigla(RUBRICA_SIGLA)).thenReturn(Optional.of(rubrica));

        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        verba.marcarEmDistribuicao(); // pré-condição: precisa estar EM_DISTRIBUICAO para marcarDistribuida funcionar
        when(verbaRepository.findByRubricaIdAndPeriodo(RUBRICA_ID, PERIODO)).thenReturn(Optional.of(verba));
        when(verbaRepository.save(any(Verba.class))).thenAnswer(inv -> inv.getArgument(0));

        Message message = buildCloudEventMessage("distribuicao.processo.finalizado", RUBRICA_SIGLA, PERIODO);

        // Act
        listener.onMessage(message);

        // Assert
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.DISTRIBUIDA);
        verify(verbaRepository, times(1)).save(verba);
    }

    // ── Cenário c: type desconhecido → ignora sem save ───────────────────────────

    /**
     * (c) onMessage com tipo desconhecido deve ignorar sem chamar save e sem lançar exceção.
     */
    @Test
    void onMessage_TypeDesconhecido_DeveIgnorar() {
        // Arrange
        Message message = buildCloudEventMessage("distribuicao.processo.outro", RUBRICA_SIGLA, PERIODO);

        // Act — não deve lançar exceção
        listener.onMessage(message);

        // Assert — nenhuma interação com repositórios
        verify(rubricaRepository, never()).findBySigla(any());
        verify(verbaRepository, never()).findByRubricaIdAndPeriodo(any(), any());
        verify(verbaRepository, never()).save(any());
    }

    // ── Cenário d: rubrica inexistente → log e skip ───────────────────────────────

    /**
     * (d) onMessage quando rubrica não existe deve logar warn e não chamar save.
     */
    @Test
    void onMessage_RubricaInexistente_DeveLogarESkip() {
        // Arrange
        when(rubricaRepository.findBySigla(RUBRICA_SIGLA)).thenReturn(Optional.empty());

        Message message = buildCloudEventMessage("distribuicao.processo.iniciado", RUBRICA_SIGLA, PERIODO);

        // Act — não deve lançar exceção
        listener.onMessage(message);

        // Assert — save nunca chamado
        verify(verbaRepository, never()).findByRubricaIdAndPeriodo(any(), any());
        verify(verbaRepository, never()).save(any());
    }

    // ── Cenário e: verba inexistente → log e skip ─────────────────────────────────

    /**
     * (e) onMessage quando verba não existe para (rubrica, periodo) deve logar warn e não chamar save.
     */
    @Test
    void onMessage_VerbaInexistente_DeveLogarESkip() {
        // Arrange
        Rubrica rubrica = new Rubrica(RUBRICA_ID, RUBRICA_SIGLA, "Radio Comercial", false);
        when(rubricaRepository.findBySigla(RUBRICA_SIGLA)).thenReturn(Optional.of(rubrica));
        when(verbaRepository.findByRubricaIdAndPeriodo(RUBRICA_ID, PERIODO)).thenReturn(Optional.empty());

        Message message = buildCloudEventMessage("distribuicao.processo.iniciado", RUBRICA_SIGLA, PERIODO);

        // Act — não deve lançar exceção
        listener.onMessage(message);

        // Assert — save nunca chamado
        verify(verbaRepository, never()).save(any());
    }

    // ── Cenário f: idempotência em reexecução ────────────────────────────────────

    /**
     * (f) onMessage com iniciado aplicado duas vezes não falha (idempotência garantida pela entidade).
     * Save é chamado 2x (cada chamada é independente), mas o status não muda na segunda execução.
     */
    @Test
    void onMessage_IniciadoIdempotente_NaoFalhaEmReexecucao() {
        // Arrange
        Rubrica rubrica = new Rubrica(RUBRICA_ID, RUBRICA_SIGLA, "Radio Comercial", false);
        when(rubricaRepository.findBySigla(RUBRICA_SIGLA)).thenReturn(Optional.of(rubrica));

        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        when(verbaRepository.findByRubricaIdAndPeriodo(RUBRICA_ID, PERIODO)).thenReturn(Optional.of(verba));
        when(verbaRepository.save(any(Verba.class))).thenAnswer(inv -> inv.getArgument(0));

        Message message = buildCloudEventMessage("distribuicao.processo.iniciado", RUBRICA_SIGLA, PERIODO);

        // Act — primeira execução
        listener.onMessage(message);
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.EM_DISTRIBUICAO);

        // Act — segunda execução (redelivery / reprocessamento idempotente)
        listener.onMessage(message);

        // Assert — status continua EM_DISTRIBUICAO (no-op), save chamado 2x total, sem exceção
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.EM_DISTRIBUICAO);
        verify(verbaRepository, times(2)).save(verba);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

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
