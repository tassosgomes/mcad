package br.com.ecad.distribuicao.domain.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "outbox_events", schema = "distribuicao")
public class OutboxEvent {
    public static final int MAX_ATTEMPTS = 10;

    @Id
    private UUID id;

    @Column(nullable = false, length = 100)
    private String type;

    @Column(name = "routing_key", nullable = false, length = 100)
    private String routingKey;

    @Column(nullable = false, length = 255)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(nullable = false)
    private int attempts;

    protected OutboxEvent() {
    }

    private OutboxEvent(
            UUID id,
            String type,
            String routingKey,
            String subject,
            String payload,
            Instant createdAt,
            Instant publishedAt,
            int attempts) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.type = Objects.requireNonNull(type, "type must not be null");
        this.routingKey = Objects.requireNonNull(routingKey, "routingKey must not be null");
        this.subject = Objects.requireNonNull(subject, "subject must not be null");
        this.payload = Objects.requireNonNull(payload, "payload must not be null");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
        this.publishedAt = publishedAt;
        this.attempts = attempts;
    }

    public static OutboxEvent criar(String type, String subject, String payload) {
        return new OutboxEvent(
                UUID.randomUUID(),
                type,
                type,
                subject,
                payload,
                Instant.now(),
                null,
                0);
    }

    public void marcarPublicado() {
        this.publishedAt = Instant.now();
    }

    public void incrementarTentativa() {
        this.attempts++;
    }

    public boolean excedeuTentativas() {
        return attempts >= MAX_ATTEMPTS;
    }

    public UUID getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getRoutingKey() {
        return routingKey;
    }

    public String getSubject() {
        return subject;
    }

    public String getPayload() {
        return payload;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public int getAttempts() {
        return attempts;
    }
}
