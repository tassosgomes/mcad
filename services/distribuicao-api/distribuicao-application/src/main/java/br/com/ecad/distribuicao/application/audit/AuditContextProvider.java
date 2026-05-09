package br.com.ecad.distribuicao.application.audit;

public interface AuditContextProvider {
    AuditContext current(String fallbackUsername);
}
