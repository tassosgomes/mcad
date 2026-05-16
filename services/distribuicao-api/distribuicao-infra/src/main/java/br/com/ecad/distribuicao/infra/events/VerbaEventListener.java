package br.com.ecad.distribuicao.infra.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class VerbaEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(VerbaEventListener.class);

    private final VerbaEventHandler verbaEventHandler;
    private final ObjectMapper objectMapper;

    public VerbaEventListener(VerbaEventHandler verbaEventHandler, ObjectMapper objectMapper) {
        this.verbaEventHandler = verbaEventHandler;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.verba:distribuicao.verba}")
    public void onMessage(Message message) {
        try {
            JsonNode cloudEventNode = objectMapper.readTree(message.getBody());
            String eventType = cloudEventNode.path("type").asText("unknown");
            JsonNode dataNode = cloudEventNode.path("data");

            if (dataNode.isMissingNode() || dataNode.isNull()) {
                LOGGER.error("Evento de Verba descartado: campo data ausente. type={}", eventType);
                return;
            }

            String rubricaSigla = dataNode.path("rubricaSigla").asText(null);
            String periodo = dataNode.path("periodo").asText(null);

            if (rubricaSigla == null || rubricaSigla.isBlank()) {
                LOGGER.error("Evento de Verba descartado: rubricaSigla ausente. type={}", eventType);
                return;
            }
            if (periodo == null || periodo.isBlank()) {
                LOGGER.error("Evento de Verba descartado: periodo ausente. type={} rubrica={}", eventType, rubricaSigla);
                return;
            }

            BigDecimal verbaLiquida = parseBigDecimal(dataNode, "verbaLiquida");
            if (verbaLiquida == null) {
                LOGGER.error(
                        "Evento de Verba descartado: verbaLiquida ausente. type={} rubrica={} periodo={}",
                        eventType, rubricaSigla, periodo);
                return;
            }

            VerbaEventPayload payload = new VerbaEventPayload(
                    rubricaSigla,
                    periodo,
                    parseBigDecimal(dataNode, "valorBruto"),
                    parseBigDecimal(dataNode, "deducaoEcad"),
                    parseBigDecimal(dataNode, "deducaoAssociacoes"),
                    verbaLiquida);

            verbaEventHandler.handleVerbaDisponivel(payload);
        } catch (Exception exception) {
            LOGGER.error("Erro ao processar evento de Verba", exception);
        }
    }

    private BigDecimal parseBigDecimal(JsonNode node, String fieldName) {
        JsonNode field = node.path(fieldName);
        if (field.isMissingNode() || field.isNull()) {
            return null;
        }
        try {
            return new BigDecimal(field.asText());
        } catch (NumberFormatException ex) {
            LOGGER.warn("Valor inválido para campo {}. valor={}", fieldName, field.asText());
            return null;
        }
    }
}
