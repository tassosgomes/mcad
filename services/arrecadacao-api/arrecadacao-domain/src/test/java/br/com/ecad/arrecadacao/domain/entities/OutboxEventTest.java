package br.com.ecad.arrecadacao.domain.entities;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class OutboxEventTest {

    @Test
    void criarShouldCreatePendingEventWithGeneratedMetadata() {
        Instant before = Instant.now();

        OutboxEvent event = OutboxEvent.criar("arrecadacao.rubrica.criada", "entity-123", "{\"sigla\":\"RADIO\"}");

        Instant after = Instant.now();

        assertThat(event.getId()).isNotNull();
        assertThat(event.getType()).isEqualTo("arrecadacao.rubrica.criada");
        assertThat(event.getRoutingKey()).isEqualTo("arrecadacao.rubrica.criada");
        assertThat(event.getSubject()).isEqualTo("entity-123");
        assertThat(event.getPayload()).isEqualTo("{\"sigla\":\"RADIO\"}");
        assertThat(event.getCreatedAt()).isBetween(before, after);
        assertThat(event.getPublishedAt()).isNull();
        assertThat(event.getAttempts()).isZero();
    }

    @Test
    void marcarPublicadoShouldSetPublishedAtToCurrentInstant() {
        OutboxEvent event = OutboxEvent.criar("arrecadacao.rubrica.criada", "entity-123", "{}");
        Instant before = Instant.now();

        event.marcarPublicado();

        Instant after = Instant.now();
        assertThat(event.getPublishedAt()).isBetween(before, after);
    }

    @Test
    void incrementarTentativaShouldIncrementAttemptsByOne() {
        OutboxEvent event = OutboxEvent.criar("arrecadacao.rubrica.criada", "entity-123", "{}");

        event.incrementarTentativa();

        assertThat(event.getAttempts()).isEqualTo(1);
    }

    @Test
    void excedeuTentativasShouldReturnFalseWhenAttemptsAreBelowLimit() {
        OutboxEvent event = OutboxEvent.criar("arrecadacao.rubrica.criada", "entity-123", "{}");
        for (int index = 0; index < OutboxEvent.MAX_ATTEMPTS - 1; index++) {
            event.incrementarTentativa();
        }

        assertThat(event.excedeuTentativas()).isFalse();
    }

    @Test
    void excedeuTentativasShouldReturnTrueWhenAttemptsReachLimit() {
        OutboxEvent event = OutboxEvent.criar("arrecadacao.rubrica.criada", "entity-123", "{}");
        for (int index = 0; index < OutboxEvent.MAX_ATTEMPTS; index++) {
            event.incrementarTentativa();
        }

        assertThat(event.excedeuTentativas()).isTrue();
    }
}
