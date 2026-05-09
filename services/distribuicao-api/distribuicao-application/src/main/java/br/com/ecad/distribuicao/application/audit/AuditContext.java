package br.com.ecad.distribuicao.application.audit;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AuditContext(
        String userId,
        String username,
        String displayName,
        List<String> roles,
        String authProvider,
        String ip,
        String userAgent,
        String traceId,
        String requestId,
        String userSessionId,
        String screenAccessId,
        String commandId,
        String screenId,
        String screenName,
        String route,
        String channel
) {
    public static AuditContext system(String username) {
        String requestId = UUID.randomUUID().toString();
        return new AuditContext(
                username, username, username,
                List.of(), "system",
                null, null,
                requestId.replace("-", ""), requestId,
                null, null, null, null, null, null,
                "SYSTEM"
        );
    }

    public Map<String, Object> businessContext(String entityType, String entityId) {
        return Map.of("entityType", entityType, "entityId", entityId);
    }
}
