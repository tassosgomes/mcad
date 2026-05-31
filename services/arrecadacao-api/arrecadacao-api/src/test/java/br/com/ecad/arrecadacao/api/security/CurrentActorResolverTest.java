package br.com.ecad.arrecadacao.api.security;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.ecad.arrecadacao.application.actor.CurrentActor;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@ExtendWith(OutputCaptureExtension.class)
class CurrentActorResolverTest {

    private final CurrentActorResolver resolver = new CurrentActorResolver();

    @Test
    void resolve_WithCompleteJwt_ShouldUseClaims() {
        JwtAuthenticationToken authentication = jwtAuthentication(Map.of(
                "sub", "user-sub-1",
                "preferred_username", "maria.silva",
                "name", "Maria Silva",
                "email", "maria.silva@mcad.dev"));

        CurrentActor actor = resolver.resolve(authentication);

        assertThat(actor.subject()).isEqualTo("user-sub-1");
        assertThat(actor.username()).isEqualTo("maria.silva");
        assertThat(actor.displayName()).isEqualTo("Maria Silva");
        assertThat(actor.email()).isEqualTo("maria.silva@mcad.dev");
    }

    @Test
    void resolve_WithJwtWithoutPreferredUsername_ShouldKeepUsernameNull() {
        JwtAuthenticationToken authentication = jwtAuthentication(Map.of(
                "sub", "user-sub-2",
                "name", "Joao Souza",
                "email", "joao.souza@mcad.dev"));

        CurrentActor actor = resolver.resolve(authentication);

        assertThat(actor.subject()).isEqualTo("user-sub-2");
        assertThat(actor.username()).isNull();
        assertThat(actor.displayName()).isEqualTo("Joao Souza");
        assertThat(actor.email()).isEqualTo("joao.souza@mcad.dev");
    }

    @Test
    void resolve_WithJwtWithoutSubject_ShouldFallbackToAuthenticationName() {
        JwtAuthenticationToken authentication = jwtAuthentication("fallback-name", Map.of(
                "preferred_username", "ana",
                "name", "Ana"));

        CurrentActor actor = resolver.resolve(authentication);

        assertThat(actor.subject()).isEqualTo("fallback-name");
        assertThat(actor.username()).isEqualTo("ana");
        assertThat(actor.displayName()).isEqualTo("Ana");
        assertThat(actor.email()).isNull();
    }

    @Test
    void resolve_WithNonJwtAuthentication_ShouldFallbackToAuthenticationNameAndLogInfo(CapturedOutput output) {
        TestingAuthenticationToken authentication = new TestingAuthenticationToken("operador", "credentials");

        CurrentActor actor = resolver.resolve(authentication);

        assertThat(actor.subject()).isEqualTo("operador");
        assertThat(actor.username()).isNull();
        assertThat(actor.displayName()).isNull();
        assertThat(actor.email()).isNull();
        assertThat(output.getAll())
                .contains("Resolving current actor from non-JWT authentication for subject=operador");
    }

    @Test
    void resolve_WithMissingAuthentication_ShouldReturnSystemActor() {
        CurrentActor actor = resolver.resolve(null);

        assertThat(actor.subject()).isEqualTo("sistema");
        assertThat(actor.username()).isNull();
        assertThat(actor.displayName()).isNull();
        assertThat(actor.email()).isNull();
    }

    private JwtAuthenticationToken jwtAuthentication(Map<String, Object> claims) {
        return jwtAuthentication(null, claims);
    }

    private JwtAuthenticationToken jwtAuthentication(String name, Map<String, Object> claims) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claims(values -> values.putAll(claims))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
        return name == null ? new JwtAuthenticationToken(jwt) : new JwtAuthenticationToken(jwt, List.of(), name);
    }
}
