package br.com.ecad.arrecadacao.api.audit;

import br.com.ecad.arrecadacao.application.audit.AuditContext;
import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.UUID;

@Component
public class HttpAuditContextProvider implements AuditContextProvider {
    private static final String HEADER_SCREEN_ACCESS_ID = "X-Audit-Screen-Access-Id";
    private static final String HEADER_COMMAND_ID = "X-Audit-Command-Id";
    private static final String HEADER_SCREEN_ID = "X-Audit-Screen-Id";
    private static final String HEADER_SCREEN_NAME = "X-Audit-Screen-Name";
    private static final String HEADER_ROUTE = "X-Audit-Route";
    private static final String HEADER_SESSION_ID = "X-Audit-Session-Id";
    private static final String HEADER_REQUEST_ID = "X-Request-Id";
    private static final String HEADER_CORRELATION_ID = "X-Correlation-Id";
    private static final String HEADER_TRACEPARENT = "traceparent";

    @Override
    public AuditContext current(String fallbackUsername) {
        HttpServletRequest request = currentRequest();
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = fallbackUsername;
        String userId = fallbackUsername;
        String displayName = fallbackUsername;
        String authProvider = "spring-security";

        if (authentication instanceof JwtAuthenticationToken jwt) {
            username = claimOrDefault(jwt, "preferred_username", fallbackUsername);
            userId = claimOrDefault(jwt, "sub", username);
            displayName = claimOrDefault(jwt, "name", username);
            authProvider = "oidc";
        } else if (authentication != null && authentication.getName() != null) {
            username = authentication.getName();
            userId = authentication.getName();
            displayName = authentication.getName();
        }

        String requestId = headerOrGenerated(request, HEADER_REQUEST_ID);
        return new AuditContext(
                userId,
                username,
                displayName,
                roles(),
                authProvider,
                clientIp(request),
                header(request, "User-Agent"),
                traceId(request, requestId),
                requestId,
                header(request, HEADER_SESSION_ID),
                header(request, HEADER_SCREEN_ACCESS_ID),
                header(request, HEADER_COMMAND_ID),
                header(request, HEADER_SCREEN_ID),
                header(request, HEADER_SCREEN_NAME),
                header(request, HEADER_ROUTE),
                "WEB"
        );
    }

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest();
        }
        return null;
    }

    private List<String> roles() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return List.of();
        }
        return authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .map(authority -> authority.startsWith("ROLE_") ? authority.substring(5) : authority)
                .toList();
    }

    private String claimOrDefault(JwtAuthenticationToken jwt, String claimName, String fallback) {
        Object value = jwt.getToken().getClaims().get(claimName);
        return value instanceof String text && !text.isBlank() ? text : fallback;
    }

    private String traceId(HttpServletRequest request, String fallback) {
        String traceparent = header(request, HEADER_TRACEPARENT);
        if (traceparent != null) {
            String[] parts = traceparent.split("-");
            if (parts.length >= 2 && !parts[1].isBlank()) {
                return parts[1];
            }
        }
        String correlationId = header(request, HEADER_CORRELATION_ID);
        return correlationId == null ? fallback.replace("-", "") : correlationId;
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = header(request, "X-Forwarded-For");
        if (forwardedFor != null) {
            return forwardedFor.split(",")[0].trim();
        }
        return request == null ? null : request.getRemoteAddr();
    }

    private String headerOrGenerated(HttpServletRequest request, String name) {
        String value = header(request, name);
        return value == null ? UUID.randomUUID().toString() : value;
    }

    private String header(HttpServletRequest request, String name) {
        if (request == null) {
            return null;
        }
        String value = request.getHeader(name);
        return value == null || value.isBlank() ? null : value;
    }
}
