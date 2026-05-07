package br.com.ecad.distribuicao.domain.interfaces;

public interface OutboxEventWriter {
    void addEvent(String eventType, String subject, Object data);
}
