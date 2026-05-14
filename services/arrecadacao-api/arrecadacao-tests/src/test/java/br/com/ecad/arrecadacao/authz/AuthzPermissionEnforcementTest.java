package br.com.ecad.arrecadacao.authz;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.org.ecad.authz.sdk.cache.LocalDecisionCache;
import br.org.ecad.authz.sdk.cache.RemoteDecisionCache;
import br.org.ecad.authz.sdk.client.AuthzDecisionClient;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifica que o {@code authz-spring-boot-starter} gera as decisões esperadas (401/403/200)
 * para os endpoints anotados com {@code @RequiresPermission}.
 *
 * <p>Liga o starter via {@code ecad.authz.enabled=true} e mocka o {@link AuthzDecisionClient}
 * para evitar dependência externa do serviço de AuthZ; também mocka o {@link RemoteDecisionCache}
 * para não exigir Redis.
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
            "ecad.authz.enabled=true",
            "ecad.authz.base-url=http://localhost:8085",
            "ecad.authz.catalog.registration-required=false",
            "ecad.authz.idp.subject-claim=sub",
            "ecad.authz.idp.session-id-claim=sid",
            "app.security.auth-enabled=false",
            "spring.autoconfigure.exclude="
                    + "org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,"
                    + "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,"
                    + "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
        })
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@AutoConfigureMockMvc
@SuppressWarnings("null")
class AuthzPermissionEnforcementTest {

    @Autowired MockMvc mockMvc;

    @MockBean private AuthzDecisionClient authzDecisionClient;

    @MockBean private RemoteDecisionCache remoteDecisionCache;

    @MockBean private RabbitTemplate rabbitTemplate;

    // Evita OIDC discovery em testes substituindo o JwtDecoder da SecurityConfig.
    @MockBean private JwtDecoder jwtDecoder;

    @Autowired private LocalDecisionCache localDecisionCache;

    @BeforeEach
    void setUp() {
        when(remoteDecisionCache.get(anyString())).thenReturn(Optional.empty());
        when(remoteDecisionCache.isSessionRevoked(anyString())).thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        // Como o aspect popula o cache local com base na decisão, limpamos para
        // que cada teste exercite a chamada ao client mockado.
        localDecisionCache.invalidateAll();
    }

    @Test
    void deveRetornar401QuandoChamadaSemJwt() throws Exception {
        // Sem post-processor de jwt() → SecurityContext não terá JwtAuthenticationToken
        // → o aspect lança InvalidTokenException → 401.
        mockMvc.perform(get("/api/v1/uda/vigente"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void deveRetornar403QuandoDecisaoForNegada() throws Exception {
        when(authzDecisionClient.checkDecision(
                eq("arrecadacao:default:cobranca:listar"), any(), anyString()))
            .thenReturn(false);

        mockMvc.perform(get("/api/v1/uda/vigente")
                .with(jwt().jwt(j -> j.subject("user-sem-permissao").claim("sid", "sess-1"))))
            .andExpect(status().isForbidden());
    }

    @Test
    void deveRetornar503QuandoServicoDeDecisaoFalha() throws Exception {
        when(authzDecisionClient.checkDecision(anyString(), any(), anyString()))
            .thenThrow(new org.springframework.web.client.ResourceAccessException("down"));

        mockMvc.perform(get("/api/v1/uda/vigente")
                .with(jwt().jwt(j -> j.subject("user-x").claim("sid", "sess-1"))))
            .andExpect(status().isServiceUnavailable());
    }

    @Test
    void deveDeixarRequisicaoProsseguirQuandoDecisaoForPermitida() throws Exception {
        // Aspect responde "permitido" → o controller é invocado. Sem DB neste teste de slice,
        // o controller propaga uma exceção do data layer; o importante é que NÃO seja
        // 401/403/503 — comprovando que o aspect liberou a execução.
        when(authzDecisionClient.checkDecision(
                eq("arrecadacao:default:cobranca:listar"), any(), anyString()))
            .thenReturn(true);

        var result = mockMvc.perform(get("/api/v1/uda/vigente")
                .with(jwt().jwt(j -> j.subject("user-com-permissao").claim("sid", "sess-1"))))
            .andReturn();

        int status = result.getResponse().getStatus();
        // qualquer status diferente de 401/403/503 prova que o aspect liberou a chamada.
        org.assertj.core.api.Assertions.assertThat(status)
            .isNotIn(401, 403, 503);
    }
}
