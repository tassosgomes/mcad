package br.com.ecad.arrecadacao.infra.events;

import br.com.ecad.arrecadacao.domain.entities.OutboxEvent;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataOutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@SuppressWarnings("null")
public class OutboxEventWriterImpl implements OutboxEventWriter {

    private final SpringDataOutboxEventRepository springDataOutboxEventRepository;
    private final ObjectMapper objectMapper;

    public OutboxEventWriterImpl(
            SpringDataOutboxEventRepository springDataOutboxEventRepository,
            ObjectMapper objectMapper) {
        this.springDataOutboxEventRepository = springDataOutboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void addEvent(String eventType, String subject, Object data) {
        springDataOutboxEventRepository.save(OutboxEvent.criar(eventType, subject, serialize(data)));
    }

    private String serialize(Object data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to serialize outbox event payload", exception);
        }
    }
}
