package br.com.ecad.distribuicao.tests.authz;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.application.commands.CalcularProcessoCommand;
import br.com.ecad.distribuicao.application.commands.handlers.CalcularProcessoCommandHandler;
import br.com.ecad.distribuicao.application.dto.CalcularProcessoResponse;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.tests.config.TestSecurityConfig;
import br.org.ecad.audit.sdk.AuditClient;
import br.org.ecad.authz.sdk.cache.LocalDecisionCache;
import br.org.ecad.authz.sdk.cache.RemoteDecisionCache;
import br.org.ecad.authz.sdk.client.AuthzDecisionClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Covers the Distribuicao enforcement contract from ADR 0006
 * ({@code docs/adr/0006-perfis-built-in-rbac.md}) through the
 * {@code authz-spring-boot-starter}: unauthenticated calls return 401, authenticated callers without
 * the endpoint permission return 403, and the four built-in Distribuicao roles follow the current
 * {@code seeds/mcad/roles.json} permission catalog.
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
            "spring.rabbitmq.listener.simple.auto-startup=false",
            "otel.sdk.disabled=true",
            "management.tracing.enabled=false"
        })
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@AutoConfigureMockMvc
@Testcontainers
@SuppressWarnings("null")
class AuthzPermissionEnforcementTest {

    private static final String CONSULTOR = "distribuicao.default.consultor";
    private static final String OPERADOR = "distribuicao.default.operador";
    private static final String GERENTE = "distribuicao.default.gerente";
    private static final String ANALISTA = "distribuicao.default.analista";

    private static final String RUBRICA_LISTAR = "distribuicao:default:rubrica:listar";
    private static final String RUBRICA_VISUALIZAR = "distribuicao:default:rubrica:visualizar";
    private static final String PROCESSO_LISTAR = "distribuicao:default:processo:listar";
    private static final String PROCESSO_VISUALIZAR = "distribuicao:default:processo:visualizar";
    private static final String PROCESSO_CRIAR = "distribuicao:default:processo:criar";
    private static final String PROCESSO_CALCULAR = "distribuicao:default:processo:calcular";
    private static final String PROCESSO_APROVAR = "distribuicao:default:processo:aprovar";
    private static final String PROCESSO_FINALIZAR = "distribuicao:default:processo:finalizar";
    private static final String PROCESSO_CANCELAR = "distribuicao:default:processo:cancelar";
    private static final String PROCESSO_RECALCULAR_POS_CALCULADO =
            "distribuicao:default:processo:recalcular-pos-calculado";
    private static final String AJUSTE_LISTAR = "distribuicao:default:ajuste:listar";
    private static final String AJUSTE_VISUALIZAR = "distribuicao:default:ajuste:visualizar";

    private static final String PROCESSO_REQUEST = """
            {"rubricaSigla":"RADIO","periodo":"2026-03"}
            """;
    private static final String CANCELAR_REQUEST = """
            {"justificativa":"Justificativa longa"}
            """;

    private static final List<String> ROLE_KEYS = List.of(CONSULTOR, OPERADOR, GERENTE, ANALISTA);

    private static final Map<String, Set<String>> ROLE_PERMISSIONS = Map.of(
            CONSULTOR,
            Set.of(
                    RUBRICA_LISTAR,
                    RUBRICA_VISUALIZAR,
                    PROCESSO_LISTAR,
                    PROCESSO_VISUALIZAR,
                    "distribuicao:default:credito:listar",
                    "distribuicao:default:credito:visualizar",
                    "distribuicao:default:demonstrativo:visualizar",
                    AJUSTE_LISTAR,
                    AJUSTE_VISUALIZAR),
            OPERADOR,
            Set.of(
                    RUBRICA_LISTAR,
                    RUBRICA_VISUALIZAR,
                    PROCESSO_LISTAR,
                    PROCESSO_VISUALIZAR,
                    "distribuicao:default:credito:listar",
                    "distribuicao:default:credito:visualizar",
                    "distribuicao:default:demonstrativo:visualizar",
                    PROCESSO_CRIAR,
                    PROCESSO_CALCULAR,
                    AJUSTE_LISTAR,
                    AJUSTE_VISUALIZAR),
            GERENTE,
            Set.of(
                    RUBRICA_LISTAR,
                    RUBRICA_VISUALIZAR,
                    PROCESSO_LISTAR,
                    PROCESSO_VISUALIZAR,
                    "distribuicao:default:credito:listar",
                    "distribuicao:default:credito:visualizar",
                    PROCESSO_APROVAR,
                    PROCESSO_FINALIZAR,
                    PROCESSO_CANCELAR,
                    "distribuicao:default:processo:exportar",
                    "distribuicao:default:processo:ver-justificativa-cancelamento",
                    "distribuicao:default:processo:ver-historico-alteracoes",
                    "distribuicao:default:credito:ver-historico-alteracoes",
                    "distribuicao:default:demonstrativo:visualizar",
                    "distribuicao:default:demonstrativo:exportar",
                    "cadastro:default:titular:ver-cpf-completo",
                    "acessos:distribuicao:papel:visualizar",
                    "acessos:distribuicao:atribuicao:ver-historico",
                    AJUSTE_LISTAR,
                    AJUSTE_VISUALIZAR),
            ANALISTA,
            Set.of(
                    RUBRICA_LISTAR,
                    RUBRICA_VISUALIZAR,
                    PROCESSO_LISTAR,
                    PROCESSO_VISUALIZAR,
                    "distribuicao:default:credito:listar",
                    "distribuicao:default:credito:visualizar",
                    PROCESSO_CRIAR,
                    PROCESSO_CALCULAR,
                    PROCESSO_APROVAR,
                    PROCESSO_FINALIZAR,
                    PROCESSO_CANCELAR,
                    "distribuicao:default:processo:exportar",
                    "distribuicao:default:processo:ver-justificativa-cancelamento",
                    PROCESSO_RECALCULAR_POS_CALCULADO,
                    "distribuicao:default:credito-retido:liberar-manual",
                    "distribuicao:default:demonstrativo:visualizar",
                    "distribuicao:default:demonstrativo:exportar",
                    "cadastro:default:titular:ver-cpf-completo",
                    AJUSTE_LISTAR,
                    AJUSTE_VISUALIZAR));

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

    @Autowired private MockMvc mockMvc;

    @MockBean private AuthzDecisionClient authzDecisionClient;
    @MockBean private RemoteDecisionCache remoteDecisionCache;
    @MockBean private RabbitTemplate rabbitTemplate;
    @MockBean private JwtDecoder jwtDecoder;
    @MockBean private AuditClient auditClient;
    @MockBean private CalcularProcessoCommandHandler calcularProcessoCommandHandler;

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

    @ParameterizedTest(name = "{0} {1} -> allowed={2}")
    @MethodSource("roleEndpointMatrix")
    void enforcePermission_WithRoleAndEndpoint_ShouldMatchCatalog(
            String roleKey,
            SecuredEndpoint endpoint,
            boolean expectedAllowed) throws Exception {
        givenCallerWithRole(roleKey);

        if (expectedAllowed) {
            MvcResult result = mockMvc.perform(endpoint.request().with(jwtForRole(roleKey)))
                    .andReturn();

            assertNotAuthorizationFailure(result, endpoint, roleKey);
            return;
        }

        mockMvc.perform(endpoint.request().with(jwtForRole(roleKey)))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest(name = "{0} without JWT -> 401")
    @MethodSource("securedEndpoints")
    void enforcePermission_WithoutJwt_ShouldReturnUnauthorized(SecuredEndpoint endpoint) throws Exception {
        mockMvc.perform(endpoint.request())
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest(name = "{0} without permissions -> 403")
    @MethodSource("securedEndpoints")
    void enforcePermission_WithJwtWithoutPermission_ShouldReturnForbidden(SecuredEndpoint endpoint) throws Exception {
        givenCallerWithPermissions(Set.of());

        mockMvc.perform(endpoint.request().with(jwtForRole("distribuicao.default.sem-permissao")))
                .andExpect(status().isForbidden());
    }

    @Test
    void roleCatalog_WithRecalcularPosCalculadoPermission_ShouldGrantOnlyAnalista() {
        List<String> rolesWithPermission = ROLE_KEYS.stream()
                .filter(roleKey -> ROLE_PERMISSIONS.get(roleKey).contains(PROCESSO_RECALCULAR_POS_CALCULADO))
                .toList();

        assertThat(rolesWithPermission).containsExactly(ANALISTA);
    }

    @Test
    void calcular_WithAuthorizationHeader_ShouldPropagateHeaderToCommand() throws Exception {
        UUID processoId = UUID.randomUUID();
        String authorizationHeader = "Bearer analyst-token";
        givenCallerWithRole(ANALISTA);
        givenDecodedBearerToken("analyst-token", ANALISTA);
        when(calcularProcessoCommandHandler.handle(any(CalcularProcessoCommand.class)))
                .thenReturn(calculoResponse(processoId));

        mockMvc.perform(post("/api/v1/processos/{id}/calcular", processoId)
                        .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                        .with(jwtForRole(ANALISTA)))
                .andExpect(status().isOk());

        ArgumentCaptor<CalcularProcessoCommand> commandCaptor =
                ArgumentCaptor.forClass(CalcularProcessoCommand.class);
        verify(calcularProcessoCommandHandler).handle(commandCaptor.capture());
        assertThat(commandCaptor.getValue().processoId()).isEqualTo(processoId);
        assertThat(commandCaptor.getValue().bearerToken()).isEqualTo(authorizationHeader);
    }

    private void givenCallerWithRole(String roleKey) {
        givenCallerWithPermissions(ROLE_PERMISSIONS.getOrDefault(roleKey, Set.of()));
    }

    private void givenCallerWithPermissions(Set<String> permissions) {
        when(authzDecisionClient.checkDecision(anyString(), any(), anyString()))
                .thenAnswer(invocation -> permissions.contains(invocation.getArgument(0, String.class)));
    }

    private void givenDecodedBearerToken(String tokenValue, String roleKey) {
        when(jwtDecoder.decode(tokenValue)).thenReturn(jwtForBearerToken(tokenValue, roleKey));
    }

    private static Stream<Arguments> roleEndpointMatrix() {
        return ROLE_KEYS.stream()
                .flatMap(roleKey -> securedEndpoints()
                        .map(endpoint -> Arguments.of(
                                roleKey,
                                endpoint,
                                ROLE_PERMISSIONS.get(roleKey).contains(endpoint.requiredPermission()))));
    }

    private static Stream<SecuredEndpoint> securedEndpoints() {
        return Stream.of(
                new SecuredEndpoint(
                        "GET /api/v1/processos",
                        PROCESSO_LISTAR,
                        () -> get("/api/v1/processos")),
                new SecuredEndpoint(
                        "GET /api/v1/processos/disponiveis",
                        PROCESSO_LISTAR,
                        () -> get("/api/v1/processos/disponiveis")),
                new SecuredEndpoint(
                        "GET /api/v1/processos/{id}",
                        PROCESSO_VISUALIZAR,
                        () -> get("/api/v1/processos/{id}", UUID.randomUUID())),
                new SecuredEndpoint(
                        "POST /api/v1/processos",
                        PROCESSO_CRIAR,
                        () -> post("/api/v1/processos")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(PROCESSO_REQUEST)),
                new SecuredEndpoint(
                        "POST /api/v1/processos/{id}/calcular",
                        PROCESSO_CALCULAR,
                        () -> post("/api/v1/processos/{id}/calcular", UUID.randomUUID())),
                new SecuredEndpoint(
                        "GET /api/v1/processos/{id}/calculo",
                        PROCESSO_VISUALIZAR,
                        () -> get("/api/v1/processos/{id}/calculo", UUID.randomUUID())),
                new SecuredEndpoint(
                        "POST /api/v1/processos/{id}/aprovar",
                        PROCESSO_APROVAR,
                        () -> post("/api/v1/processos/{id}/aprovar", UUID.randomUUID())),
                new SecuredEndpoint(
                        "POST /api/v1/processos/{id}/finalizar",
                        PROCESSO_FINALIZAR,
                        () -> post("/api/v1/processos/{id}/finalizar", UUID.randomUUID())),
                new SecuredEndpoint(
                        "POST /api/v1/processos/{id}/cancelar",
                        PROCESSO_CANCELAR,
                        () -> post("/api/v1/processos/{id}/cancelar", UUID.randomUUID())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(CANCELAR_REQUEST)),
                new SecuredEndpoint(
                        "GET /api/v1/rubricas",
                        RUBRICA_LISTAR,
                        () -> get("/api/v1/rubricas")),
                new SecuredEndpoint(
                        "GET /api/v1/rubricas/{sigla}",
                        RUBRICA_VISUALIZAR,
                        () -> get("/api/v1/rubricas/{sigla}", "RADIO")),
                new SecuredEndpoint(
                        "GET /api/v1/ajustes-estorno",
                        AJUSTE_LISTAR,
                        () -> get("/api/v1/ajustes-estorno")),
                new SecuredEndpoint(
                        "GET /api/v1/ajustes-estorno/{id}",
                        AJUSTE_VISUALIZAR,
                        () -> get("/api/v1/ajustes-estorno/{id}", UUID.randomUUID())));
    }

    private static RequestPostProcessor jwtForRole(String roleKey) {
        return jwt().jwt(jwt -> jwt
                .subject(roleKey)
                .claim("sid", "sess-" + roleKey)
                .claim("roles", List.of(roleKey)));
    }

    private static Jwt jwtForBearerToken(String tokenValue, String roleKey) {
        Instant issuedAt = Instant.parse("2026-03-01T00:00:00Z");
        return Jwt.withTokenValue(tokenValue)
                .header("alg", "none")
                .subject(roleKey)
                .claim("sid", "sess-" + roleKey)
                .claim("roles", List.of(roleKey))
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plusSeconds(300))
                .build();
    }

    private static CalcularProcessoResponse calculoResponse(UUID processoId) {
        return new CalcularProcessoResponse(
                processoId,
                StatusProcesso.CALCULADO,
                "RADIO",
                "2026-03",
                BigDecimal.TEN,
                0,
                0,
                BigDecimal.ZERO,
                0,
                BigDecimal.ZERO,
                0,
                BigDecimal.ZERO,
                0,
                BigDecimal.ZERO,
                Instant.parse("2026-03-01T00:00:00Z"));
    }

    private static void assertNotAuthorizationFailure(
            MvcResult result,
            SecuredEndpoint endpoint,
            String roleKey) {
        assertThat(result.getResponse().getStatus())
                .as("%s should pass authorization for %s", roleKey, endpoint)
                .isNotIn(
                        HttpStatus.UNAUTHORIZED.value(),
                        HttpStatus.FORBIDDEN.value(),
                        HttpStatus.SERVICE_UNAVAILABLE.value());
    }

    private record SecuredEndpoint(
            String name,
            String requiredPermission,
            Supplier<MockHttpServletRequestBuilder> requestFactory) {

        MockHttpServletRequestBuilder request() {
            return requestFactory.get();
        }

        @Override
        public String toString() {
            return name;
        }
    }
}
