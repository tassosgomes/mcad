package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.OutboxEvent;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaOutboxEventRepository implements OutboxEventRepository {

    private final EntityManager entityManager;

    public JpaOutboxEventRepository(EntityManager entityManager) {
        this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
    }

    @Override
    public List<OutboxEvent> findPending(int limit) {
        return entityManager.createQuery("""
                        select event
                        from OutboxEvent event
                        where event.publishedAt is null
                          and event.attempts < :maxAttempts
                        order by event.createdAt asc
                        """, OutboxEvent.class)
                .setParameter("maxAttempts", OutboxEvent.MAX_ATTEMPTS)
                .setMaxResults(limit)
                .getResultList();
    }

    @Override
    @Transactional
    public OutboxEvent save(OutboxEvent outboxEvent) {
        entityManager.persist(outboxEvent);
        return outboxEvent;
    }

    @Override
    public boolean existsByTypeAndSubject(String type, String subject) {
        Long count = entityManager.createQuery("""
                        select count(event)
                        from OutboxEvent event
                        where event.type = :type
                          and event.subject = :subject
                        """, Long.class)
                .setParameter("type", type)
                .setParameter("subject", subject)
                .getSingleResult();
        return count > 0;
    }
}
