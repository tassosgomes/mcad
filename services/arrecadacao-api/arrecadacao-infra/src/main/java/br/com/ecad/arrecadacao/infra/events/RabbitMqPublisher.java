package br.com.ecad.arrecadacao.infra.events;

import br.com.ecad.arrecadacao.api.config.RabbitMqConfig;
import br.com.ecad.arrecadacao.domain.entities.OutboxEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import io.cloudevents.core.format.EventFormat;
import io.cloudevents.core.provider.EventFormatProvider;
import io.cloudevents.jackson.JsonFormat;
import java.net.URI;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class RabbitMqPublisher {

    static final String SOURCE = "urn:arrecadacao-api";

    private static final Logger LOGGER = LoggerFactory.getLogger(RabbitMqPublisher.class);
    private static final EventFormat JSON_FORMAT =
            EventFormatProvider.getInstance().resolveFormat(JsonFormat.CONTENT_TYPE);

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public RabbitMqPublisher(RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(OutboxEvent outboxEvent) {
        CloudEvent cloudEvent = CloudEventBuilder.v1()
                .withId(outboxEvent.getId().toString())
                .withSource(URI.create(SOURCE))
                .withType(outboxEvent.getType())
                .withSubject(outboxEvent.getSubject())
                .withTime(OffsetDateTime.ofInstant(outboxEvent.getCreatedAt(), ZoneOffset.UTC))
                .withDataContentType("application/json")
                .withData(serializePayload(outboxEvent.getPayload()))
                .build();

        byte[] body = JSON_FORMAT.serialize(cloudEvent);
        MessageProperties properties = new MessageProperties();
        properties.setContentType(JsonFormat.CONTENT_TYPE);
        properties.setMessageId(cloudEvent.getId());
        properties.setDeliveryMode(MessageDeliveryMode.PERSISTENT);

        rabbitTemplate.send(
                RabbitMqConfig.ARRECADACAO_EVENTS_EXCHANGE,
                outboxEvent.getRoutingKey(),
                new Message(body, properties));

        LOGGER.debug(
                "Outbox event published. eventId={} type={} subject={}",
                outboxEvent.getId(),
                outboxEvent.getType(),
                outboxEvent.getSubject());
    }

    private byte[] serializePayload(String payload) {
        try {
            Map<String, Object> payloadMap = objectMapper.readValue(payload, new TypeReference<>() {
            });
            return objectMapper.writeValueAsBytes(payloadMap);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Failed to serialize CloudEvent payload", exception);
        }
    }
}
