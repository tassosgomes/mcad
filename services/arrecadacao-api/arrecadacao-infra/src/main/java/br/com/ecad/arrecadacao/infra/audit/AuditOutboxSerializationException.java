package br.com.ecad.arrecadacao.infra.audit;

public class AuditOutboxSerializationException extends RuntimeException {
    public AuditOutboxSerializationException(String message, Throwable cause) {
        super(message, cause);
    }
}
