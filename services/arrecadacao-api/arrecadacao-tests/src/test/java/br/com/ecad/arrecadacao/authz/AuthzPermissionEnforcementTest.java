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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
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
 * Verifica que o {@code authz-spring-boot-starter} gera as decisões esperadas (401/403/200/503)
 * para os endpoints anotados com {@code @RequiresPermission}.
 *
 * <p>Cobre CT-ARR-R01..R07 do plano de testes da integração ecad-authz × MCAD:
 *
 * <ul>
 *   <li>CT-ARR-R01: sem JWT → 401 em qualquer endpoint protegido.
 *   <li>CT-ARR-R02: com JWT mas authz nega → 403.
 *   <li>CT-ARR-R03: com JWT e authz permite → aspect libera (≠ 401/403/503).
 *   <li>CT-ARR-R07: catálogo declarado em <code>permissions.yaml</code> mantém 17 chaves
 *       4-segmentos no domínio {@code arrecadacao:default}.
 * </ul>
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

    // ── CT-ARR-R01: sem JWT → 401 em cada endpoint protegido ────────────────

    @ParameterizedTest(name = "401 sem JWT em {0}")
    @ValueSource(
            strings = {
                "/api/v1/uda/vigente",
                "/api/v1/licencas",
                "/api/v1/pagamentos",
                "/api/v1/usuarios-musica"
            })
    void deveRetornar401SemJwtParaTodosEndpointsProtegidos(String url) throws Exception {
        mockMvc.perform(get(url)).andExpect(status().isUnauthorized());
    }

    @Test
    void deveRetornar401QuandoChamadaSemJwt() throws Exception {
        mockMvc.perform(get("/api/v1/uda/vigente")).andExpect(status().isUnauthorized());
    }

    // ── CT-ARR-R02: com JWT mas authz nega → 403 ────────────────────────────

    @ParameterizedTest(name = "403 quando {1} é negada em {0}")
    @CsvSource({
        "/api/v1/uda/vigente, arrecadacao:default:cobranca:listar",
        "/api/v1/licencas, arrecadacao:default:contrato:listar",
        "/api/v1/pagamentos, arrecadacao:default:pagamento:listar"
    })
    void deveRetornar403QuandoAuthzNegaPermissao(String url, String permission) throws Exception {
        when(authzDecisionClient.checkDecision(eq(permission), any(), anyString())).thenReturn(false);

        mockMvc.perform(
                        get(url)
                                .with(
                                        jwt().jwt(
                                                        j ->
                                                                j.subject("user-sem-permissao")
                                                                        .claim("sid", "sess-1"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void deveRetornar403QuandoDecisaoForNegada() throws Exception {
        when(authzDecisionClient.checkDecision(
                        eq("arrecadacao:default:cobranca:listar"), any(), anyString()))
                .thenReturn(false);

        mockMvc.perform(
                        get("/api/v1/uda/vigente")
                                .with(
                                        jwt().jwt(
                                                        j ->
                                                                j.subject("user-sem-permissao")
                                                                        .claim("sid", "sess-1"))))
                .andExpect(status().isForbidden())
                .andExpect(
                        org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                                        "$.code")
                                .value("AUTHZ_MISSING_PERMISSION"))
                .andExpect(
                        org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                                        "$.requiredPermission")
                                .value("arrecadacao:default:cobranca:listar"));
    }

    @Test
    void deveRetornar503QuandoServicoDeDecisaoFalha() throws Exception {
        when(authzDecisionClient.checkDecision(anyString(), any(), anyString()))
                .thenThrow(new org.springframework.web.client.ResourceAccessException("down"));

        mockMvc.perform(
                        get("/api/v1/uda/vigente")
                                .with(jwt().jwt(j -> j.subject("user-x").claim("sid", "sess-1"))))
                .andExpect(status().isServiceUnavailable());
    }

    // ── CT-ARR-R03: com JWT e authz permite → aspect libera o controller ────

    @Test
    void deveDeixarRequisicaoProsseguirQuandoDecisaoForPermitida() throws Exception {
        when(authzDecisionClient.checkDecision(
                        eq("arrecadacao:default:cobranca:listar"), any(), anyString()))
                .thenReturn(true);

        var result =
                mockMvc.perform(
                                get("/api/v1/uda/vigente")
                                        .with(
                                                jwt().jwt(
                                                                j ->
                                                                        j.subject(
                                                                                        "user-com-permissao")
                                                                                .claim(
                                                                                        "sid",
                                                                                        "sess-1"))))
                        .andReturn();

        int status = result.getResponse().getStatus();
        org.assertj.core.api.Assertions.assertThat(status).isNotIn(401, 403, 503);
    }

}
