package br.com.ecad.arrecadacao.api.security;

import br.com.ecad.arrecadacao.application.actor.CurrentActor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class CurrentActorResolver {

    private static final Logger LOGGER = LoggerFactory.getLogger(CurrentActorResolver.class);
    private static final String SYSTEM_ACTOR = "sistema";

    public CurrentActor resolveCurrent() {
        return resolve(SecurityContextHolder.getContext().getAuthentication());
    }

    public CurrentActor resolve(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            return fromJwt(jwtAuthentication);
        }

        String subject = authenticationName(authentication);
        if (!SYSTEM_ACTOR.equals(subject)) {
            LOGGER.info("Resolving current actor from non-JWT authentication for subject={}", subject);
        }

        return new CurrentActor(subject, null, null, null);
    }

    private CurrentActor fromJwt(JwtAuthenticationToken authentication) {
        String subject = textOrNull(authentication.getToken().getClaimAsString("sub"));
        if (subject == null) {
            subject = authenticationName(authentication);
        }

        return new CurrentActor(
                subject,
                textOrNull(authentication.getToken().getClaimAsString("preferred_username")),
                textOrNull(authentication.getToken().getClaimAsString("name")),
                textOrNull(authentication.getToken().getClaimAsString("email")));
    }

    private String authenticationName(Authentication authentication) {
        if (authentication == null) {
            return SYSTEM_ACTOR;
        }

        String name = textOrNull(authentication.getName());
        return name == null ? SYSTEM_ACTOR : name;
    }

    private String textOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
