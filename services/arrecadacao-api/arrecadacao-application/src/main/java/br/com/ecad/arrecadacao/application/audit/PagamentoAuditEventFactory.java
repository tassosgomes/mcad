package br.com.ecad.arrecadacao.application.audit;

import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.org.ecad.audit.contract.AuditEvent;
import br.org.ecad.audit.contract.DataAction;
import br.org.ecad.audit.contract.EventType;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class PagamentoAuditEventFactory {
    private static final int SCHEMA_VERSION = 1;
    private static final String SERVICE_NAME = "arrecadacao-api";
    private static final String SYSTEM_NAME = "mcad";
    private static final String SOURCE_SCHEMA = "arrecadacao";
    private static final String ENVIRONMENT = "local";
    private static final String ENTITY_TYPE = "Pagamento";
    private static final String SCREEN_ID = "ARRECADACAO_PAGAMENTOS";
    private static final String SCREEN_NAME = "Pagamentos";

    public AuditEvent userAction(Pagamento pagamento, AuditContext context) {
        return new AuditEvent(
                UUID.randomUUID().toString(),
                SCHEMA_VERSION,
                EventType.USER_ACTION,
                OffsetDateTime.now(ZoneOffset.UTC),
                source(),
                actor(context),
                origin(context),
                correlation(context),
                null,
                security(),
                Map.of("reason", "Registro de pagamento"),
                null,
                new AuditEvent.UserAction(
                        "REGISTRAR_PAGAMENTO",
                        "Registrar pagamento",
                        context.businessContext(ENTITY_TYPE, pagamento.getId().toString())
                )
        );
    }

    public AuditEvent dataChange(Pagamento pagamento, AuditContext context) {
        return new AuditEvent(
                UUID.randomUUID().toString(),
                SCHEMA_VERSION,
                EventType.DATA_CHANGE,
                OffsetDateTime.now(ZoneOffset.UTC),
                source(),
                actor(context),
                origin(context),
                correlation(context),
                new AuditEvent.Data(
                        ENTITY_TYPE,
                        pagamento.getId().toString(),
                        null,
                        DataAction.CREATE,
                        null,
                        pagamentoMap(pagamento),
                        List.of()
                ),
                security(),
                Map.of("reason", "Pagamento registrado"),
                null,
                null
        );
    }

    private AuditEvent.Source source() {
        return new AuditEvent.Source(SERVICE_NAME, SYSTEM_NAME, SOURCE_SCHEMA, ENVIRONMENT);
    }

    private AuditEvent.Actor actor(AuditContext context) {
        return new AuditEvent.Actor(
                context.userId(),
                context.username(),
                context.displayName(),
                "USER",
                context.roles(),
                context.authProvider()
        );
    }

    private AuditEvent.Origin origin(AuditContext context) {
        return new AuditEvent.Origin(
                valueOrDefault(context.channel(), "WEB"),
                context.ip(),
                context.userAgent(),
                context.route(),
                valueOrDefault(context.screenId(), SCREEN_ID),
                valueOrDefault(context.screenName(), SCREEN_NAME)
        );
    }

    private AuditEvent.Correlation correlation(AuditContext context) {
        return new AuditEvent.Correlation(
                context.traceId(),
                context.requestId(),
                context.userSessionId(),
                context.screenAccessId(),
                context.commandId(),
                null
        );
    }

    private AuditEvent.SecurityInfo security() {
        return new AuditEvent.SecurityInfo("INTERNAL", List.of());
    }

    private Map<String, Object> pagamentoMap(Pagamento pagamento) {
        return Map.of(
                "id", pagamento.getId().toString(),
                "licencaId", pagamento.getLicencaId().toString(),
                "quantidadeUdas", pagamento.getQuantidadeUdas().toPlainString(),
                "valorUdaNoMomento", pagamento.getValorUdaNoMomento().toPlainString(),
                "valorBruto", pagamento.getValorBruto().toPlainString(),
                "periodo", pagamento.getPeriodo(),
                "status", pagamento.getStatus().name(),
                "dataRegistro", pagamento.getDataRegistro().toString()
        );
    }

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
