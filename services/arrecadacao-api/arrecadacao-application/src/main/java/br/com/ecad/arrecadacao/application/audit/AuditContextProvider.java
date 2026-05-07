package br.com.ecad.arrecadacao.application.audit;

public interface AuditContextProvider {
    AuditContext current(String fallbackUsername);
}
