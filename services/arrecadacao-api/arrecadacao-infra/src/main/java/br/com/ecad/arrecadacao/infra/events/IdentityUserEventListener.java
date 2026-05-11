package br.com.ecad.arrecadacao.infra.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class IdentityUserEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(IdentityUserEventListener.class);

    private final IdentityUserProjectionRepository repository;
    private final ObjectMapper objectMapper;

    public IdentityUserEventListener(
            IdentityUserProjectionRepository repository,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = "${app.identity-events.queue}")
    public void onMessage(Message message) {
        try {
            IdentityUserEvent event = parse(message);
            if (!event.isSupported()) {
                LOGGER.warn("Evento de identidade ignorado. eventType={}", event.eventType());
                return;
            }

            repository.upsert(event);
            LOGGER.info(
                    "Usuario de identidade sincronizado. logtoUserId={} eventType={}",
                    event.user().logtoUserId(),
                    event.eventType());
        } catch (IllegalArgumentException exception) {
            LOGGER.warn("Evento de identidade descartado: payload invalido.", exception);
        } catch (Exception exception) {
            LOGGER.error("Erro ao processar evento de identidade", exception);
            throw new IllegalStateException("Failed to process identity user event", exception);
        }
    }

    private IdentityUserEvent parse(Message message) throws Exception {
        JsonNode root = objectMapper.readTree(message.getBody());
        JsonNode userNode = root.path("user");
        if (userNode.isMissingNode() || userNode.isNull()) {
            throw new IllegalArgumentException("Missing user payload");
        }

        String eventType = requiredText(root, "eventType");
        String rolesJson = userNode.path("roles").isArray()
                ? objectMapper.writeValueAsString(userNode.path("roles"))
                : "[]";
        String rawPayloadJson = userNode.path("raw").isObject()
                ? objectMapper.writeValueAsString(userNode.path("raw"))
                : "{}";

        return new IdentityUserEvent(
                requiredText(root, "eventId"),
                eventType,
                OffsetDateTime.parse(requiredText(root, "occurredAt")),
                new IdentityUser(
                        requiredText(userNode, "logtoUserId"),
                        nullableText(userNode, "username"),
                        nullableText(userNode, "displayName"),
                        nullableText(userNode, "email"),
                        nullableText(userNode, "avatarUrl"),
                        rolesJson,
                        userNode.path("isSuspended").asBoolean(false),
                        rawPayloadJson));
    }

    private static String requiredText(JsonNode node, String fieldName) {
        String value = nullableText(node, fieldName);
        if (value == null) {
            throw new IllegalArgumentException("Missing required field: " + fieldName);
        }
        return value;
    }

    private static String nullableText(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull() || value.asText().isBlank()) {
            return null;
        }
        return value.asText();
    }

    public record IdentityUserEvent(
            String eventId,
            String eventType,
            OffsetDateTime occurredAt,
            IdentityUser user) {

        boolean isSupported() {
            return "identity.user.upserted".equals(eventType)
                    || "identity.user.suspended".equals(eventType)
                    || "identity.user.deleted".equals(eventType);
        }
    }

    public record IdentityUser(
            String logtoUserId,
            String username,
            String displayName,
            String email,
            String avatarUrl,
            String rolesJson,
            boolean suspended,
            String rawPayloadJson) {
    }
}
