package br.com.ecad.distribuicao.infra.events;

import br.com.ecad.distribuicao.domain.entities.OutboxEvent;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OutboxPublisherWorker {

    static final int DEFAULT_BATCH_SIZE = 100;

    private static final Logger LOGGER = LoggerFactory.getLogger(OutboxPublisherWorker.class);

    private final OutboxEventRepository outboxEventRepository;
    private final RabbitMqPublisher rabbitMqPublisher;

    public OutboxPublisherWorker(
            OutboxEventRepository outboxEventRepository,
            RabbitMqPublisher rabbitMqPublisher) {
        this.outboxEventRepository = outboxEventRepository;
        this.rabbitMqPublisher = rabbitMqPublisher;
    }

    @Scheduled(fixedDelayString = "${app.outbox.publisher.poll-interval-ms:5000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findPending(DEFAULT_BATCH_SIZE);
        if (pendingEvents.isEmpty()) {
            return;
        }

        for (OutboxEvent pendingEvent : pendingEvents) {
            if (pendingEvent.excedeuTentativas()) {
                continue;
            }

            try {
                rabbitMqPublisher.publish(pendingEvent);
                pendingEvent.marcarPublicado();
                outboxEventRepository.save(pendingEvent);
                LOGGER.debug(
                        "Outbox event published. eventId={} type={}",
                        pendingEvent.getId(),
                        pendingEvent.getType());
            } catch (Exception exception) {
                pendingEvent.incrementarTentativa();
                outboxEventRepository.save(pendingEvent);
                LOGGER.warn(
                        "Failed to publish outbox event. eventId={} type={} attempts={}",
                        pendingEvent.getId(),
                        pendingEvent.getType(),
                        pendingEvent.getAttempts(),
                        exception);
            }
        }
    }
}
