package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.OutboxEvent;
import java.util.List;

public interface OutboxEventRepository {
    List<OutboxEvent> findPending(int limit);
    OutboxEvent save(OutboxEvent outboxEvent);
    boolean existsByTypeAndSubject(String type, String subject);
}
