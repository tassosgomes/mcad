package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.OutboxEvent;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventRepository;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JpaOutboxEventRepository implements OutboxEventRepository {

    private final SpringDataOutboxEventRepository springDataOutboxEventRepository;

    public JpaOutboxEventRepository(SpringDataOutboxEventRepository springDataOutboxEventRepository) {
        this.springDataOutboxEventRepository = springDataOutboxEventRepository;
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
}
