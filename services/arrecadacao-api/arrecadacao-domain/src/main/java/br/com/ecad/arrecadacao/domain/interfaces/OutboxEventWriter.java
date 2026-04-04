package br.com.ecad.arrecadacao.domain.interfaces;

public interface OutboxEventWriter {
    void addEvent(String eventType, String subject, Object data);
}
