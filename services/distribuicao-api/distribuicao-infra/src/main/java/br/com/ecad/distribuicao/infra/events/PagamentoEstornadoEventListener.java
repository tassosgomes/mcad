package br.com.ecad.distribuicao.infra.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Listener RabbitMQ para o evento {@code arrecadacao.pagamento.estornado}.
 *
 * <p>O método {@code onMessage} nunca propaga exceção: qualquer falha é logada e o
 * evento é descartado, evitando re-entrega pelo container AMQP.
 * (spring.rabbitmq.listener.simple.default-requeue-rejected=false já está configurado,
 * mas manter o catch garante comportamento explícito.)
 */
@Component
public class PagamentoEstornadoEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(PagamentoEstornadoEventListener.class);

    private final ObjectMapper objectMapper;
    private final PagamentoEstornadoEventHandler handler;

    public PagamentoEstornadoEventListener(ObjectMapper objectMapper,
            PagamentoEstornadoEventHandler handler) {
        this.objectMapper = objectMapper;
        this.handler = handler;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.estornos:distribuicao.pagamento-estornado}")
    public void onMessage(Message message) {
        String rawPayload = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            JsonNode cloudEvent = objectMapper.readTree(rawPayload);
            PagamentoEstornadoEventPayload payload = parseAndValidate(cloudEvent);
            handler.handle(payload, rawPayload);
        } catch (EventoInvalidoException ex) {
            LOGGER.error("Evento de estorno descartado: {}", ex.getMessage());
        } catch (Exception ex) {
            LOGGER.error("Erro ao processar evento de estorno", ex);
        }
    }

    // -------------------------------------------------------------------------
    // Validação e parsing do CloudEvent
    // -------------------------------------------------------------------------

    private PagamentoEstornadoEventPayload parseAndValidate(JsonNode cloudEvent) {
        require(cloudEvent, "specversion", "1.0");
        require(cloudEvent, "type", "arrecadacao.pagamento.estornado");

        UUID eventId = parseUuid(cloudEvent, "id");
        requireText(cloudEvent, "source");
        requireText(cloudEvent, "subject");
        requireText(cloudEvent, "time");
        requireText(cloudEvent, "datacontenttype");

        JsonNode data = cloudEvent.get("data");
        if (data == null || !data.isObject()) {
            throw new EventoInvalidoException("data ausente ou não é objeto");
        }

        UUID pagamentoId = parseUuid(data, "pagamentoId");
        UUID licencaId = parseUuid(data, "licencaId");
        String rubricaSigla = requireText(data, "rubricaSigla");
        String periodoOrigem = requireText(data, "periodo");
        BigDecimal quantidadeUdas = parseDecimal(data, "quantidadeUdas");
        BigDecimal valorEstornadoBruto = parseDecimal(data, "valorEstornado");
        String justificativa = requireText(data, "justificativa");
        String estornadoPor = requireText(data, "estornadoPor");
        Instant estornadoEm = parseInstant(data, "estornadoEm");

        return new PagamentoEstornadoEventPayload(
                eventId,
                pagamentoId,
                licencaId,
                rubricaSigla,
                periodoOrigem,
                quantidadeUdas,
                valorEstornadoBruto,
                justificativa,
                estornadoPor,
                estornadoEm);
    }

    // -------------------------------------------------------------------------
    // Helpers de validação
    // -------------------------------------------------------------------------

    private void require(JsonNode node, String field, String expectedValue) {
        JsonNode n = node.get(field);
        if (n == null || n.isNull() || n.isMissingNode()) {
            throw new EventoInvalidoException("campo obrigatorio ausente: " + field);
        }
        if (!expectedValue.equals(n.asText())) {
            throw new EventoInvalidoException(
                    "campo " + field + " esperado '" + expectedValue + "', recebido '" + n.asText() + "'");
        }
    }

    private String requireText(JsonNode node, String field) {
        JsonNode n = node.get(field);
        if (n == null || n.isNull() || n.isMissingNode()) {
            throw new EventoInvalidoException("campo obrigatorio ausente: " + field);
        }
        String value = n.asText(null);
        if (value == null || value.isBlank()) {
            throw new EventoInvalidoException("campo obrigatorio em branco: " + field);
        }
        return value;
    }

    private UUID parseUuid(JsonNode node, String field) {
        String text = requireText(node, field);
        try {
            return UUID.fromString(text);
        } catch (IllegalArgumentException ex) {
            throw new EventoInvalidoException("campo " + field + " nao e UUID valido: " + text);
        }
    }

    private BigDecimal parseDecimal(JsonNode node, String field) {
        String text = requireText(node, field);
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException ex) {
            throw new EventoInvalidoException("campo " + field + " nao e decimal valido: " + text);
        }
    }

    private Instant parseInstant(JsonNode node, String field) {
        String text = requireText(node, field);
        try {
            return Instant.parse(text);
        } catch (Exception ex) {
            throw new EventoInvalidoException("campo " + field + " nao e date-time valido: " + text);
        }
    }
}
