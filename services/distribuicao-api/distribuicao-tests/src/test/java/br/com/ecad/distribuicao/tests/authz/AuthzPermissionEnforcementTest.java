package br.com.ecad.distribuicao.tests.authz;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.tests.config.TestSecurityConfig;
import br.org.ecad.audit.sdk.AuditClient;
import br.org.ecad.authz.sdk.cache.LocalDecisionCache;
import br.org.ecad.authz.sdk.cache.RemoteDecisionCache;
import br.org.ecad.authz.sdk.client.AuthzDecisionClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Verifica que o {@code authz-spring-boot-starter} gera as decisões esperadas (401/403/200)
 * para os endpoints do {@code ProcessoController} anotados com {@code @RequiresPermission}.
 */
@SpringBootTest(
        classes = DistribuicaoApiApplication.class,
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
                    + "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration",
            "spring.rabbitmq.listener.simple.auto-startup=false"
        })
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@AutoConfigureMockMvc
@Testcontainers
@SuppressWarnings("null")
class AuthzPermissionEnforcementTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> postgres.getJdbcUrl() + "&currentSchema=distribuicao");
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
        registry.add("spring.rabbitmq.host", () -> "localhost");
        registry.add("spring.rabbitmq.port", () -> 5672);
    }

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean private AuthzDecisionClient authzDecisionClient;
    @MockBean private RemoteDecisionCache remoteDecisionCache;
    @MockBean private RabbitTemplate rabbitTemplate;
    @MockBean private JwtDecoder jwtDecoder;
    @MockBean private AuditClient auditClient;

    @Autowired private LocalDecisionCache localDecisionCache;

    @BeforeEach
    void setUp() {
        when(remoteDecisionCache.get(anyString())).thenReturn(Optional.empty());
        when(remoteDecisionCache.isSessionRevoked(anyString())).thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        localDecisionCache.invalidateAll();
    }

    // ========== GET /api/v1/processos (listar) ==========

    @Test
    void listar_SemJwt_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/v1/processos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listar_ComPermissaoNegada_DeveRetornar403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:listar"), any(), anyString()))
                .thenReturn(false);
        mockMvc.perform(get("/api/v1/processos").with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void listar_ComPermissaoPermitida_NaoDeveRetornar401Ou403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:listar"), any(), anyString()))
                .thenReturn(true);
        var result = mockMvc.perform(get("/api/v1/processos").with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isNotIn(401, 403, 503);
    }

    // ========== GET /api/v1/processos/disponiveis ==========

    @Test
    void disponiveis_SemJwt_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/v1/processos/disponiveis"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void disponiveis_ComPermissaoNegada_DeveRetornar403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:listar"), any(), anyString()))
                .thenReturn(false);
        mockMvc.perform(get("/api/v1/processos/disponiveis").with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void disponiveis_ComPermissaoPermitida_NaoDeveRetornar401Ou403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:listar"), any(), anyString()))
                .thenReturn(true);
        var result = mockMvc.perform(get("/api/v1/processos/disponiveis")
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isNotIn(401, 403, 503);
    }

    // ========== GET /api/v1/processos/{id} (visualizar) ==========

    @Test
    void buscarPorId_SemJwt_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/v1/processos/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void buscarPorId_ComPermissaoNegada_DeveRetornar403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:visualizar"), any(), anyString()))
                .thenReturn(false);
        mockMvc.perform(get("/api/v1/processos/" + UUID.randomUUID())
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void buscarPorId_ComPermissaoPermitida_NaoDeveRetornar401Ou403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:visualizar"), any(), anyString()))
                .thenReturn(true);
        var result = mockMvc.perform(get("/api/v1/processos/" + UUID.randomUUID())
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isNotIn(401, 403, 503);
    }

    // ========== POST /api/v1/processos (criar) ==========

    @Test
    void criar_SemJwt_DeveRetornar401() throws Exception {
        mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", "RADIO", "periodo", "2026-03"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void criar_ComPermissaoNegada_DeveRetornar403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:criar"), any(), anyString()))
                .thenReturn(false);
        mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", "RADIO", "periodo", "2026-03")))
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void criar_ComPermissaoPermitida_NaoDeveRetornar401Ou403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:criar"), any(), anyString()))
                .thenReturn(true);
        var result = mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", "RADIO", "periodo", "2026-03")))
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isNotIn(401, 403, 503);
    }

    // ========== POST /api/v1/processos/{id}/aprovar ==========

    @Test
    void aprovar_SemJwt_DeveRetornar401() throws Exception {
        mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/aprovar"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aprovar_ComPermissaoNegada_DeveRetornar403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:aprovar"), any(), anyString()))
                .thenReturn(false);
        mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/aprovar")
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void aprovar_ComPermissaoPermitida_NaoDeveRetornar401Ou403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:aprovar"), any(), anyString()))
                .thenReturn(true);
        var result = mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/aprovar")
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isNotIn(401, 403, 503);
    }

    // ========== POST /api/v1/processos/{id}/finalizar ==========

    @Test
    void finalizar_SemJwt_DeveRetornar401() throws Exception {
        mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/finalizar"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void finalizar_ComPermissaoNegada_DeveRetornar403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:finalizar"), any(), anyString()))
                .thenReturn(false);
        mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/finalizar")
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void finalizar_ComPermissaoPermitida_NaoDeveRetornar401Ou403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:finalizar"), any(), anyString()))
                .thenReturn(true);
        var result = mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/finalizar")
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isNotIn(401, 403, 503);
    }

    // ========== POST /api/v1/processos/{id}/cancelar ==========

    @Test
    void cancelar_SemJwt_DeveRetornar401() throws Exception {
        mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/cancelar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("justificativa", "Justificativa longa"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cancelar_ComPermissaoNegada_DeveRetornar403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:cancelar"), any(), anyString()))
                .thenReturn(false);
        mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/cancelar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("justificativa", "Justificativa longa")))
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void cancelar_ComPermissaoPermitida_NaoDeveRetornar401Ou403() throws Exception {
        when(authzDecisionClient.checkDecision(eq("distribuicao:default:processo:cancelar"), any(), anyString()))
                .thenReturn(true);
        var result = mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/cancelar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("justificativa", "Justificativa longa")))
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isNotIn(401, 403, 503);
    }

    // ========== GET /api/v1/rubricas (visualizar — legacy) ==========

    @Test
    void listarRubricas_SemJwt_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/v1/rubricas"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listarRubricas_ComPermissaoPermitida_NaoDeveRetornar401Ou403() throws Exception {
        when(authzDecisionClient.checkDecision(anyString(), any(), anyString()))
                .thenReturn(true);
        var result = mockMvc.perform(get("/api/v1/rubricas")
                .with(jwt().jwt(j -> j.subject("user").claim("sid", "sess"))))
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus()).isNotIn(401, 403, 503);
    }
}
