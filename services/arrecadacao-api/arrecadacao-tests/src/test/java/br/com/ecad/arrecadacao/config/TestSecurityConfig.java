package br.com.ecad.arrecadacao.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Test-only security configuration that permits all requests without JWT validation.
 * Replaces the production SecurityConfig to avoid Keycloak OIDC discovery calls on startup.
 * Method-level security (@PreAuthorize) is preserved via @EnableMethodSecurity.
 * Provides a no-op JwtDecoder to prevent the production bean from calling Keycloak at startup.
 */
@TestConfiguration
@EnableMethodSecurity
public class TestSecurityConfig {

    @Bean
    @Primary
    SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    /**
     * No-op JwtDecoder that never validates tokens — tests use @WithMockUser instead.
     * Overrides the production JwtDecoder that performs OIDC discovery against Keycloak.
     */
    @Bean
    @Primary
    JwtDecoder testJwtDecoder() {
        return token -> {
            throw new UnsupportedOperationException(
                "testJwtDecoder should never be called: tests use @WithMockUser");
        };
    }
}
