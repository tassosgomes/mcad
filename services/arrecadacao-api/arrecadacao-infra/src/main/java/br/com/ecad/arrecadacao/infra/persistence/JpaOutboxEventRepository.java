package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.OutboxEvent;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JpaOutboxEventRepository implements OutboxEventRepository, OutboxEventWriter {

    private final SpringDataOutboxEventRepository springDataOutboxEventRepository;
    private final ObjectMapper objectMapper;

    public JpaOutboxEventRepository(
            SpringDataOutboxEventRepository springDataOutboxEventRepository,
            ObjectMapper objectMapper) {
        this.springDataOutboxEventRepository = springDataOutboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OutboxEvent> findPending(int limit) {
        return springDataOutboxEventRepository.findByPublishedAtIsNullAndAttemptsLessThanOrderByCreatedAtAsc(
                OutboxEvent.MAX_ATTEMPTS,
                PageRequest.of(0, limit));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByTypeAndSubject(String type, String subject) {
        return springDataOutboxEventRepository.existsByTypeAndSubject(type, subject);
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
