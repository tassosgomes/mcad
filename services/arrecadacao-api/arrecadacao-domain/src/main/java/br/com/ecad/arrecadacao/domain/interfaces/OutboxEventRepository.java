package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.OutboxEvent;
import java.util.List;

public interface OutboxEventRepository {
    List<OutboxEvent> findPending(int limit);

    boolean existsByTypeAndSubject(String type, String subject);
}
