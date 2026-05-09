package br.com.ecad.distribuicao.api.audit;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
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
            userId = username;
            displayName = username;
        }

        List<String> roles = roles(authentication);
        String requestId = headerOrGenerated(request, HEADER_REQUEST_ID);

        return new AuditContext(
                userId, username, displayName, roles, authProvider,
                clientIp(request), header(request, "User-Agent"),
                traceId(request, requestId), requestId,
                header(request, HEADER_SESSION_ID),
                header(request, HEADER_SCREEN_ACCESS_ID),
                header(request, HEADER_COMMAND_ID),
                header(request, HEADER_SCREEN_ID),
                header(request, HEADER_SCREEN_NAME),
                header(request, HEADER_ROUTE) != null
                        ? header(request, HEADER_ROUTE)
                        : (request != null ? request.getRequestURI() : null),
                "WEB"
        );
    }

    private List<String> roles(org.springframework.security.core.Authentication authentication) {
        if (authentication == null) return List.of();
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
                .distinct()
                .toList();
    }

    private String claimOrDefault(JwtAuthenticationToken jwt, String claim, String fallback) {
        Object value = jwt.getToken().getClaims().get(claim);
        return value == null || value.toString().isBlank() ? fallback : value.toString();
    }

    private String traceId(HttpServletRequest request, String fallback) {
        String traceparent = header(request, HEADER_TRACEPARENT);
        if (traceparent != null && !traceparent.isBlank()) {
            String[] parts = traceparent.split("-");
            if (parts.length >= 2 && !parts[1].isBlank()) {
                return parts[1];
            }
        }
        String correlationId = header(request, HEADER_CORRELATION_ID);
        return correlationId != null ? correlationId : fallback.replace("-", "");
    }

    private String clientIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwardedFor = header(request, "X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String headerOrGenerated(HttpServletRequest request, String name) {
        String value = header(request, name);
        return value != null ? value : UUID.randomUUID().toString();
    }

    private String header(HttpServletRequest request, String name) {
        if (request == null) return null;
        String value = request.getHeader(name);
        return value == null || value.isBlank() ? null : value;
    }

    private HttpServletRequest currentRequest() {
        var attrs = RequestContextHolder.getRequestAttributes();
        return attrs instanceof ServletRequestAttributes sra ? sra.getRequest() : null;
    }
}
