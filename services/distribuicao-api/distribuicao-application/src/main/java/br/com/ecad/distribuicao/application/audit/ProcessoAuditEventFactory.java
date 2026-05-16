package br.com.ecad.distribuicao.application.audit;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.org.ecad.audit.contract.AuditEvent;
import br.org.ecad.audit.contract.EventType;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class ProcessoAuditEventFactory {

    private static final int SCHEMA_VERSION = 1;
    private static final String SERVICE_NAME = "distribuicao-api";
    private static final String SYSTEM_NAME = "mcad";
    private static final String SOURCE_SCHEMA = "distribuicao";
    private static final String ENVIRONMENT = "local";
    private static final String ENTITY_TYPE = "ProcessoDistribuicao";
    private static final String SCREEN_ID = "DISTRIBUICAO_PROCESSOS";
    private static final String SCREEN_NAME = "Processos de Distribuição";

    public AuditEvent userAction(ProcessoDistribuicao processo, AuditContext context, ProcessoAuditOperation operation) {
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
                Map.of("reason", operation.reason()),
                null,
                new AuditEvent.UserAction(
                        operation.code(),
                        operation.label(),
                        context.businessContext(ENTITY_TYPE, processo.getId().toString())
                )
        );
    }

    public AuditEvent dataChange(ProcessoAuditChange change, AuditContext context) {
        Map<String, Object> beforeMap = snapshotToMap(change.before());
        Map<String, Object> afterMap = snapshotToMap(ProcessoSnapshot.from(change.processo()));
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
                        change.processo().getId().toString(),
                        null,
                        change.operation().dataAction(),
                        beforeMap,
                        afterMap,
                        List.of()
                ),
                security(),
                Map.of("reason", change.operation().reason()),
                null,
                null
        );
    }

    public Map<String, Object> snapshotToMap(ProcessoSnapshot snapshot) {
        if (snapshot == null) {
            return null;
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", snapshot.id() == null ? null : snapshot.id().toString());
        map.put("rubricaSigla", snapshot.rubricaSigla());
        map.put("periodo", snapshot.periodo());
        map.put("status", snapshot.status() == null ? null : snapshot.status().name());
        map.put("verbaLiquida", snapshot.verbaLiquida() == null ? null : snapshot.verbaLiquida().toPlainString());
        map.put("totalExecucoes", snapshot.totalExecucoes());
        map.put("justificativaCancelamento", snapshot.justificativaCancelamento());
        map.put("criadoEm", snapshot.criadoEm() == null ? null : snapshot.criadoEm().toString());
        map.put("calculadoEm", snapshot.calculadoEm() == null ? null : snapshot.calculadoEm().toString());
        map.put("aprovadoEm", snapshot.aprovadoEm() == null ? null : snapshot.aprovadoEm().toString());
        map.put("finalizadoEm", snapshot.finalizadoEm() == null ? null : snapshot.finalizadoEm().toString());
        map.put("canceladoEm", snapshot.canceladoEm() == null ? null : snapshot.canceladoEm().toString());
        return map;
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

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
