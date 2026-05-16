package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.OutboxEvent;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@SuppressWarnings("null")
public class JpaOutboxEventRepository implements OutboxEventRepository {

    private final SpringDataOutboxEventRepository springDataOutboxEventRepository;

    public JpaOutboxEventRepository(SpringDataOutboxEventRepository springDataOutboxEventRepository) {
        this.springDataOutboxEventRepository =
                Objects.requireNonNull(springDataOutboxEventRepository, "springDataOutboxEventRepository must not be null");
    }

    @Override
    @Transactional(readOnly = true)
    public List<OutboxEvent> findPending(int limit) {
        return springDataOutboxEventRepository
                .findByPublishedAtIsNullAndAttemptsLessThanOrderByCreatedAtAsc(
                        OutboxEvent.MAX_ATTEMPTS, PageRequest.of(0, limit));
    }

    @Override
    @Transactional
    public OutboxEvent save(OutboxEvent outboxEvent) {
        return springDataOutboxEventRepository.save(outboxEvent);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByTypeAndSubject(String type, String subject) {
        return springDataOutboxEventRepository.existsByTypeAndSubject(type, subject);
    }
}
