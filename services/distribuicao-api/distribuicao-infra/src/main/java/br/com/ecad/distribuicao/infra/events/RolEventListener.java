package br.com.ecad.distribuicao.infra.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class RolEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(RolEventListener.class);

    private static final String TYPE_ROL_FECHADO = "identificacao.rol.fechado";
    private static final String TYPE_ROL_CANCELADO = "identificacao.rol.cancelado";

    private final RolEventHandler rolEventHandler;
    private final ObjectMapper objectMapper;

    public RolEventListener(RolEventHandler rolEventHandler, ObjectMapper objectMapper) {
        this.rolEventHandler = rolEventHandler;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.rol:distribuicao.rol}")
    public void onMessage(Message message) {
        try {
            JsonNode cloudEventNode = objectMapper.readTree(message.getBody());
            String eventType = cloudEventNode.path("type").asText("unknown");
            JsonNode dataNode = cloudEventNode.path("data");

            if (dataNode.isMissingNode() || dataNode.isNull()) {
                LOGGER.error("Evento de Rol descartado: campo data ausente. type={}", eventType);
                return;
            }

            String rubricaSigla = dataNode.path("rubricaSigla").asText(null);
            String periodo = dataNode.path("periodo").asText(null);

            if (rubricaSigla == null || rubricaSigla.isBlank()) {
                LOGGER.error("Evento de Rol descartado: rubricaSigla ausente. type={}", eventType);
                return;
            }
            if (periodo == null || periodo.isBlank()) {
                LOGGER.error("Evento de Rol descartado: periodo ausente. type={} rubrica={}", eventType, rubricaSigla);
                return;
            }

            UUID captacaoId = null;
            JsonNode captacaoIdNode = dataNode.path("captacaoId");
            if (!captacaoIdNode.isMissingNode() && !captacaoIdNode.isNull()) {
                captacaoId = UUID.fromString(captacaoIdNode.asText());
            }

            int totalExecucoes = dataNode.path("totalExecucoes").asInt(0);
            String payloadJson = objectMapper.writeValueAsString(dataNode);

            RolEventPayload payload = new RolEventPayload(
                    rubricaSigla, periodo, captacaoId, totalExecucoes, payloadJson);

            if (TYPE_ROL_FECHADO.equals(eventType)) {
                rolEventHandler.handleRolFechado(payload);
            } else if (TYPE_ROL_CANCELADO.equals(eventType)) {
                rolEventHandler.handleRolCancelado(payload);
            } else {
                LOGGER.warn("Evento de Rol com tipo desconhecido ignorado. type={}", eventType);
            }
        } catch (Exception exception) {
            LOGGER.error("Erro ao processar evento de Rol", exception);
        }
    }
}
