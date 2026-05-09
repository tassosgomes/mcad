package br.com.ecad.arrecadacao.application.audit;

import br.org.ecad.audit.contract.AuditEvent;
import br.org.ecad.audit.contract.DataAction;
import br.org.ecad.audit.contract.EventType;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Fábrica genérica para criação de eventos de auditoria. Permite reutilização entre entidades
 * sem duplicar boilerplate. Para entidades com mapeamento mais elaborado, usar a fábrica específica.
 */
@Component
public class GenericAuditEventFactory {

    private static final int SCHEMA_VERSION = 1;
    private static final String SERVICE_NAME = "arrecadacao-api";
    private static final String SYSTEM_NAME = "mcad";
    private static final String SOURCE_SCHEMA = "arrecadacao";
    private static final String ENVIRONMENT = "local";

    public AuditEvent userAction(
            String entityType,
            String entityId,
            String actionCode,
            String actionName,
            String reason,
            String screenId,
            String screenName,
            AuditContext context
    ) {
        return new AuditEvent(
                UUID.randomUUID().toString(),
                SCHEMA_VERSION,
                EventType.USER_ACTION,
                OffsetDateTime.now(ZoneOffset.UTC),
                source(),
                actor(context),
                origin(context, screenId, screenName),
                correlation(context),
                null,
                security(),
                Map.of("reason", reason),
                null,
                new AuditEvent.UserAction(
                        actionCode,
                        actionName,
                        context.businessContext(entityType, entityId)
                )
        );
    }

    public AuditEvent dataChange(
            String entityType,
            String entityId,
            DataAction dataAction,
            Map<String, Object> before,
            Map<String, Object> after,
            String reason,
            String screenId,
            String screenName,
            AuditContext context
    ) {
        Map<String, Object> dataAfter = dataAction == DataAction.DELETE ? null : after;
        List<AuditEvent.ChangedField> changedFields = buildChangedFields(before, dataAfter);

        return new AuditEvent(
                UUID.randomUUID().toString(),
                SCHEMA_VERSION,
                EventType.DATA_CHANGE,
                OffsetDateTime.now(ZoneOffset.UTC),
                source(),
                actor(context),
                origin(context, screenId, screenName),
                correlation(context),
                new AuditEvent.Data(
                        entityType,
                        entityId,
                        null,
                        dataAction,
                        before,
                        dataAfter,
                        changedFields
                ),
                security(),
                Map.of("reason", reason),
                null,
                null
        );
    }

    private AuditEvent.Source source() {
        return new AuditEvent.Source(SERVICE_NAME, SYSTEM_NAME, SOURCE_SCHEMA, ENVIRONMENT);
    }

    private AuditEvent.Actor actor(AuditContext c) {
        return new AuditEvent.Actor(c.userId(), c.username(), c.displayName(), "USER", c.roles(), c.authProvider());
    }

    private AuditEvent.Origin origin(AuditContext c, String screenId, String screenName) {
        return new AuditEvent.Origin(
                valueOrDefault(c.channel(), "WEB"),
                c.ip(),
                c.userAgent(),
                c.route(),
                valueOrDefault(c.screenId(), screenId),
                valueOrDefault(c.screenName(), screenName)
        );
    }

    private AuditEvent.Correlation correlation(AuditContext c) {
        return new AuditEvent.Correlation(
                c.traceId(), c.requestId(), c.userSessionId(),
                c.screenAccessId(), c.commandId(), null
        );
    }

    private AuditEvent.SecurityInfo security() {
        return new AuditEvent.SecurityInfo("INTERNAL", List.of());
    }

    private List<AuditEvent.ChangedField> buildChangedFields(Map<String, Object> before, Map<String, Object> after) {
        if (before == null || after == null) {
            return List.of();
        }
        List<AuditEvent.ChangedField> changes = new java.util.ArrayList<>();
        for (Map.Entry<String, Object> e : after.entrySet()) {
            Object oldValue = before.get(e.getKey());
            if (!Objects.equals(oldValue, e.getValue())) {
                changes.add(new AuditEvent.ChangedField(e.getKey(), oldValue, e.getValue()));
            }
        }
        return changes;
    }

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    public static Map<String, Object> mapOf(Map<String, Object> source) {
        Map<String, Object> result = new HashMap<>();
        if (source != null) {
            for (Map.Entry<String, Object> e : source.entrySet()) {
                result.put(e.getKey(), e.getValue());
            }
        }
        return result;
    }
}
