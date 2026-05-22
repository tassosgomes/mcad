package br.com.ecad.arrecadacao.api.config;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.proc.DefaultJOSEObjectTypeVerifier;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        @Value("${app.security.auth-enabled:true}") boolean authEnabled
    ) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        if (authEnabled) {
            http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .anyRequest().authenticated()
            );
            http.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt ->
                jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())
            ));
        } else {
            http.authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll());
        }

        return http.build();
    }

    // Logto segue RFC 9068 e emite tokens com typ=at+jwt.
    // O Spring Security 6.3 só aceita typ=JWT por padrão — usamos o builder withJwkSetUri
    // para customizar o JWSTypeVerifier e aceitar at+jwt também.
    // @ConditionalOnMissingBean: testes fornecem um JwtDecoder stub no TestSecurityConfig.
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(JwtDecoder.class)
    JwtDecoder jwtDecoder(
        @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri
    ) {
        try {
            // Descobrir jwks_uri via OIDC discovery
            var discoveryUrl = new java.net.URL(issuerUri + "/.well-known/openid-configuration");
            @SuppressWarnings("unchecked")
            var oidcConfig = (java.util.Map<String, Object>)
                new com.fasterxml.jackson.databind.ObjectMapper().readValue(discoveryUrl, java.util.Map.class);
            String jwksUri = (String) oidcConfig.get("jwks_uri");

            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri)
                .jwsAlgorithm(SignatureAlgorithm.ES384)
                .jwtProcessorCustomizer(p -> p.setJWSTypeVerifier(
                    new DefaultJOSEObjectTypeVerifier<>(
                        JOSEObjectType.JWT, new JOSEObjectType("at+jwt"), null
                    )
                ))
                .build();
            decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuerUri));
            return decoder;
        } catch (Exception e) {
            throw new RuntimeException("Falha ao configurar JwtDecoder para issuer: " + issuerUri, e);
        }
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter scopesConverter = new JwtGrantedAuthoritiesConverter();
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> extractAuthorities(jwt, scopesConverter));
        return converter;
    }

    // Logto emite roles como array flat na claim "roles" (scope "roles" requerido).
    private Collection<GrantedAuthority> extractAuthorities(
        Jwt jwt,
        JwtGrantedAuthoritiesConverter scopesConverter
    ) {
        Collection<GrantedAuthority> authorities = new ArrayList<>(scopesConverter.convert(jwt));
        List<String> roles = jwt.getClaimAsStringList("roles");

        if (roles != null) {
            for (String role : roles) {
                if (role != null) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                }
            }
        }

        return authorities;
    }
}
