package br.com.ecad.arrecadacao.infra.events;

import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OutboxSeedService {

    static final String RUBRICA_CRIADA_EVENT_TYPE = "arrecadacao.rubrica.criada";

    private static final Logger LOGGER = LoggerFactory.getLogger(OutboxSeedService.class);

    private final RubricaRepository rubricaRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final OutboxEventWriter outboxEventWriter;

    public OutboxSeedService(
            RubricaRepository rubricaRepository,
            OutboxEventRepository outboxEventRepository,
            OutboxEventWriter outboxEventWriter) {
        this.rubricaRepository = rubricaRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.outboxEventWriter = outboxEventWriter;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void publishPendingRubricaEvents() {
        int createdEvents = 0;

        for (Rubrica rubrica : rubricaRepository.findAll()) {
            String subject = rubrica.getId().toString();
            if (outboxEventRepository.existsByTypeAndSubject(RUBRICA_CRIADA_EVENT_TYPE, subject)) {
                continue;
            }

            outboxEventWriter.addEvent(
                    RUBRICA_CRIADA_EVENT_TYPE,
                    subject,
                    new RubricaCreatedPayload(
                            rubrica.getSigla(),
                            rubrica.getNome(),
                            rubrica.isExigeClassificacao()));
            createdEvents++;
        }

        LOGGER.info("Outbox seed completed. createdEvents={}", createdEvents);
    }

    public record RubricaCreatedPayload(String sigla, String nome, boolean exigeClassificacao) {
    }
}
