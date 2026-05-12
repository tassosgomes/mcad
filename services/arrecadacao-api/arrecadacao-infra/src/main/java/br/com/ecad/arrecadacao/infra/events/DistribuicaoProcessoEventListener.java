package br.com.ecad.arrecadacao.infra.events;

import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.format.EventFormat;
import io.cloudevents.core.provider.EventFormatProvider;
import io.cloudevents.jackson.JsonFormat;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Consumer de eventos de distribuição (D04).
 *
 * <p>Recebe CloudEvents estruturados (application/cloudevents+json) publicados pelo
 * serviço de Distribuição via Outbox Pattern. Atualiza o status da {@link Verba}
 * correspondente quando D04 inicia ou finaliza um processo de distribuição.</p>
 *
 * <p>Idempotência: garantida pela entidade Verba — chamar {@code marcarEmDistribuicao()}
 * quando já está em EM_DISTRIBUICAO é no-op silencioso; idem para DISTRIBUIDA.</p>
 *
 * <p>D04 ainda não publica esses eventos (PRD {@code gestao-processos}); o consumer
 * fica pronto e latente até D04 implementar a publicação.</p>
 */
@Component
public class DistribuicaoProcessoEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(DistribuicaoProcessoEventListener.class);

    private static final String TYPE_INICIADO = "distribuicao.processo.iniciado";
    private static final String TYPE_FINALIZADO = "distribuicao.processo.finalizado";

    private static final String COUNTER_NAME = "arrecadacao.verba.lock.aplicado";
    private static final String TAG_ACAO = "acao";

    private static final EventFormat JSON_FORMAT =
            EventFormatProvider.getInstance().resolveFormat(JsonFormat.CONTENT_TYPE);

    private final VerbaRepository verbaRepository;
    private final RubricaRepository rubricaRepository;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public DistribuicaoProcessoEventListener(
            VerbaRepository verbaRepository,
            RubricaRepository rubricaRepository,
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry) {
        this.verbaRepository = verbaRepository;
        this.rubricaRepository = rubricaRepository;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
    }

    @RabbitListener(queues = "${app.distribuicao-events.queue}")
    @Transactional
    public void onMessage(Message message) {
        CloudEvent event;
        try {
            event = JSON_FORMAT.deserialize(message.getBody());
        } catch (Exception ex) {
            LOGGER.error("Falha processando evento de distribuicao", ex);
            throw new IllegalStateException(ex);
        }

        String type = event.getType();

        if (!TYPE_INICIADO.equals(type) && !TYPE_FINALIZADO.equals(type)) {
            LOGGER.warn("Evento de distribuicao ignorado: {}", type);
            meterRegistry.counter(COUNTER_NAME, TAG_ACAO, "ignorado").increment();
            return;
        }

        DistribuicaoProcessoPayload payload;
        try {
            byte[] dataBytes = event.getData() != null ? event.getData().toBytes() : null;
            if (dataBytes == null || dataBytes.length == 0) {
                throw new IllegalArgumentException("Evento sem payload: " + type);
            }
            JsonNode dataNode = objectMapper.readTree(dataBytes);
            String rubricaSigla = requiredText(dataNode, "rubricaSigla");
            String periodo = requiredText(dataNode, "periodo");
            payload = new DistribuicaoProcessoPayload(rubricaSigla, periodo);
        } catch (Exception ex) {
            LOGGER.error("Falha processando evento de distribuicao", ex);
            throw new IllegalStateException(ex);
        }

        String rubricaSigla = payload.rubricaSigla();
        String periodo = payload.periodo();

        UUID rubricaId = rubricaRepository.findBySigla(rubricaSigla)
                .map(r -> r.getId())
                .orElse(null);

        if (rubricaId == null) {
            LOGGER.warn("Rubrica desconhecida; evento ignorado. sigla={}", rubricaSigla);
            meterRegistry.counter(COUNTER_NAME, TAG_ACAO, "rubrica_desconhecida").increment();
            return;
        }

        Verba verba = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, periodo).orElse(null);

        if (verba == null) {
            LOGGER.warn("Verba inexistente; lock nao aplicado. sigla={} periodo={}", rubricaSigla, periodo);
            meterRegistry.counter(COUNTER_NAME, TAG_ACAO, "verba_inexistente").increment();
            return;
        }

        try {
            switch (type) {
                case TYPE_INICIADO -> {
                    verba.marcarEmDistribuicao();
                    verbaRepository.save(verba);
                    LOGGER.info("Lock aplicado. eventType={} sigla={} periodo={} novoStatus={}",
                            type, rubricaSigla, periodo, verba.getStatus());
                    meterRegistry.counter(COUNTER_NAME, TAG_ACAO, "iniciado").increment();
                }
                case TYPE_FINALIZADO -> {
                    verba.marcarDistribuida();
                    verbaRepository.save(verba);
                    LOGGER.info("Lock aplicado. eventType={} sigla={} periodo={} novoStatus={}",
                            type, rubricaSigla, periodo, verba.getStatus());
                    meterRegistry.counter(COUNTER_NAME, TAG_ACAO, "finalizado").increment();
                }
                default -> {
                    // Nunca deve chegar aqui (filtrado acima), mas por segurança
                    LOGGER.warn("Evento de distribuicao ignorado: {}", type);
                    meterRegistry.counter(COUNTER_NAME, TAG_ACAO, "ignorado").increment();
                }
            }
        } catch (IllegalStateException ex) {
            // Transição inválida (ex: DISTRIBUIDA → EM_DISTRIBUICAO) — log error, não relançar
            LOGGER.error("Transicao de status invalida ao processar evento de distribuicao. " +
                    "eventType={} sigla={} periodo={} statusAtual={}",
                    type, rubricaSigla, periodo, verba.getStatus(), ex);
            meterRegistry.counter(COUNTER_NAME, TAG_ACAO, "transicao_invalida").increment();
        }
    }

    private static String requiredText(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull() || value.asText().isBlank()) {
            throw new IllegalArgumentException("Missing required field: " + fieldName);
        }
        return value.asText();
    }

    private record DistribuicaoProcessoPayload(String rubricaSigla, String periodo) {}
}
