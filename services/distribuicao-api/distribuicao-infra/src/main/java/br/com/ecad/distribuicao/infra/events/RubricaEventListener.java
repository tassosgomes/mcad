package br.com.ecad.distribuicao.infra.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class RubricaEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(RubricaEventListener.class);

    private final RubricaEventHandler rubricaEventHandler;
    private final ObjectMapper objectMapper;

    public RubricaEventListener(RubricaEventHandler rubricaEventHandler, ObjectMapper objectMapper) {
        this.rubricaEventHandler = rubricaEventHandler;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.rubricas}")
    public void onMessage(Message message) {
        try {
            JsonNode cloudEventNode = objectMapper.readTree(message.getBody());
            JsonNode dataNode = cloudEventNode.path("data");

            if (dataNode.isMissingNode() || dataNode.isNull()) {
                LOGGER.error(
                        "Evento de rubrica descartado: campo data ausente. type={}",
                        cloudEventNode.path("type").asText("unknown"));
                return;
            }

            RubricaEventPayload payload = objectMapper.treeToValue(dataNode, RubricaEventPayload.class);
            if (payload.sigla() == null || payload.sigla().isBlank()) {
                LOGGER.error(
                        "Evento de rubrica descartado: sigla ausente. type={}",
                        cloudEventNode.path("type").asText("unknown"));
                return;
            }
            if (payload.nome() == null || payload.nome().isBlank()) {
                LOGGER.error(
                        "Evento de rubrica descartado: nome ausente. type={} sigla={}",
                        cloudEventNode.path("type").asText("unknown"),
                        payload.sigla());
                return;
            }

            rubricaEventHandler.handle(payload);
        } catch (Exception exception) {
            LOGGER.error("Erro ao processar evento de rubrica", exception);
        }
    }
}
