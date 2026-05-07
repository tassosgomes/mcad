package br.com.ecad.arrecadacao.application.audit;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(AuditContextProvider.class)
public class NoopAuditContextProvider implements AuditContextProvider {
    @Override
    public AuditContext current(String fallbackUsername) {
        return AuditContext.system(fallbackUsername);
    }
}
