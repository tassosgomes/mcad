package br.com.ecad.distribuicao.tests.integration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.org.ecad.audit.sdk.AuditClient;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
        classes = DistribuicaoApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
            "app.security.auth-enabled=true",
            "spring.autoconfigure.exclude=br.org.ecad.audit.starter.AuditAutoConfiguration",
            "spring.rabbitmq.listener.simple.auto-startup=false",
            "otel.sdk.disabled=true",
            "management.tracing.enabled=false"
        })
@AutoConfigureMockMvc
@Testcontainers
@SuppressWarnings("null")
class DemonstrativoControllerIntegrationTest {

    private static final UUID OBRA_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID TITULAR_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID TITULAR_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000202");
    private static final UUID FONOGRAMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000301");
    private static final Instant CRIADO_EM = Instant.parse("2026-05-07T10:15:30Z");

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("postgres")
            .withPassword("postgres");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @MockBean
    private AuditClient auditClient;

    @MockBean
    private JwtDecoder jwtDecoder;

    @MockBean
    private br.org.ecad.authz.sdk.client.AuthzDecisionClient authzDecisionClient;

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

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from distribuicao.creditos");
        jdbcTemplate.update("delete from distribuicao.outbox_events");
        jdbcTemplate.update("delete from distribuicao.audit_outbox");
        jdbcTemplate.update("delete from distribuicao.processos");
        jdbcTemplate.update("delete from distribuicao.snapshots_rol");
        jdbcTemplate.update("delete from distribuicao.snapshots_verba");

        when(authzDecisionClient.checkDecision(anyString(), anyString(), anyString())).thenReturn(true);
    }

    @Test
    void listarTitulares_WithCalculatedProcess_ShouldReturnPaginatedSummary() throws Exception {
        ProcessoDistribuicao processo = persistCalculatedProcess();

        mockMvc.perform(get("/api/v1/processos/{id}/demonstrativos", processo.getId())
                        .with(consultorJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].titularNome").exists())
                .andExpect(jsonPath("$.items[0].totalCalculado").exists())
                .andExpect(jsonPath("$.items[0].totalRetido").exists())
                .andExpect(jsonPath("$.items[0].totalLiberado").exists())
                .andExpect(jsonPath("$.items[0].totalAReceber").exists())
                .andExpect(jsonPath("$.items[0].qtdObras").exists())
                .andExpect(jsonPath("$.metadata.page").value(0))
                .andExpect(jsonPath("$.metadata.size").value(20))
                .andExpect(jsonPath("$.metadata.total").value(2))
                .andExpect(jsonPath("$.metadata.totalPages").value(1));
    }

    @Test
    void listarTitulares_WithNomeFilter_ShouldReturnMatchingTitular() throws Exception {
        ProcessoDistribuicao processo = persistCalculatedProcess();

        mockMvc.perform(get("/api/v1/processos/{id}/demonstrativos", processo.getId())
                        .param("nome", "Autoral")
                        .with(consultorJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].titularNome").value("Titular Autoral"));
    }

    @Test
    void consultarTitular_WithValidIds_ShouldReturnDemonstrativoSections() throws Exception {
        ProcessoDistribuicao processo = persistCalculatedProcess();

        mockMvc.perform(get("/api/v1/processos/{id}/demonstrativos/{titularId}", processo.getId(), TITULAR_A_ID)
                        .with(analistaJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titularId").value(TITULAR_A_ID.toString()))
                .andExpect(jsonPath("$.titularNome").value("Titular Autoral"))
                .andExpect(jsonPath("$.creditosPeriodo").isArray())
                .andExpect(jsonPath("$.creditosPeriodo.length()").value(1))
                .andExpect(jsonPath("$.creditosRetidos").isArray())
                .andExpect(jsonPath("$.creditosLiberados").isArray())
                .andExpect(jsonPath("$.ajustesEstorno").isArray())
                .andExpect(jsonPath("$.resumo.totalCalculado").exists())
                .andExpect(jsonPath("$.resumo.totalAReceber").exists());
    }

    @Test
    void consultarTitular_WithUnknownTitular_ShouldReturn404() throws Exception {
        ProcessoDistribuicao processo = persistCalculatedProcess();
        UUID unknownTitular = UUID.fromString("00000000-0000-0000-0000-000000000999");

        mockMvc.perform(get("/api/v1/processos/{id}/demonstrativos/{titularId}", processo.getId(), unknownTitular)
                        .with(analistaJwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Resource Not Found"));
    }

    @Test
    void consultarTitular_WithLiberatedCredit_ShouldIncludeLiberadoSection() throws Exception {
        ProcessoDistribuicao processoCalc = persistCalculatedProcess();
        ProcessoDistribuicao processoLib = persistLiberationProcess();

        transactionTemplate.execute(status -> {
            Credito c = retidoCredito(processoCalc.getId());
            c.liberar(processoLib.getId(), Instant.now());
            entityManager.persist(c);
            entityManager.flush();
            return null;
        });

        mockMvc.perform(get("/api/v1/processos/{id}/demonstrativos/{titularId}", processoLib.getId(), TITULAR_A_ID)
                        .with(analistaJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.creditosLiberados").isArray())
                .andExpect(jsonPath("$.creditosLiberados.length()").value(1))
                .andExpect(jsonPath("$.resumo.totalLiberado").value(400.00));
    }

    private ProcessoDistribuicao persistCalculatedProcess() {
        return transactionTemplate.execute(status -> {
            ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                    "RADIO", "2026-05",
                    new BigDecimal("1000.00"), "analista", null, null);
            entityManager.persist(processo);
            entityManager.flush();
            processo.marcarCalculado(
                    10, 1,
                    new BigDecimal("10.000000"),
                    2,
                    new BigDecimal("1000.00"));
            entityManager.persist(autoralCredito(processo.getId()));
            entityManager.persist(conexoCredito(processo.getId()));
            entityManager.flush();
            return processo;
        });
    }

    private ProcessoDistribuicao persistLiberationProcess() {
        return transactionTemplate.execute(status -> {
            ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                    "TV_ABERTA", "2026-06",
                    new BigDecimal("500.00"), "analista", null, null);
            entityManager.persist(processo);
            entityManager.flush();
            return processo;
        });
    }

    private UUID findCreditoId(UUID processoId, UUID titularId) {
        return jdbcTemplate.queryForObject(
                "select id from distribuicao.creditos where processo_id = ? and titular_id = ? limit 1",
                UUID.class, processoId, titularId);
    }

    private Credito autoralCredito(UUID processoId) {
        return Credito.calculado(
                processoId, TITULAR_A_ID, "Titular Autoral",
                OBRA_ID, "Obra Calculada", null,
                CategoriaCredito.AUTORAL, null,
                new BigDecimal("100.000000"),
                new BigDecimal("700.00"),
                new BigDecimal("700.00"),
                new BigDecimal("10.000000"),
                CRIADO_EM);
    }

    private Credito conexoCredito(UUID processoId) {
        return Credito.calculado(
                processoId, TITULAR_B_ID, "Titular Conexo",
                OBRA_ID, "Obra Calculada", FONOGRAMA_ID,
                CategoriaCredito.CONEXO,
                br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa.INTERPRETE,
                new BigDecimal("100.000000"),
                new BigDecimal("300.00"),
                new BigDecimal("300.00"),
                new BigDecimal("10.000000"),
                CRIADO_EM);
    }

    private Credito retidoCredito(UUID processoId) {
        return Credito.retido(
                processoId, TITULAR_A_ID, "Titular Autoral",
                OBRA_ID, "Obra Calculada", null,
                CategoriaCredito.AUTORAL, null,
                new BigDecimal("100.000000"),
                new BigDecimal("400.00"),
                new BigDecimal("400.00"),
                new BigDecimal("10.000000"),
                MotivoRetencao.TITULAR_SEM_ASSOCIACAO,
                Instant.parse("2026-05-07T11:00:00Z"),
                CRIADO_EM);
    }

    private RequestPostProcessor analistaJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_analista-distribuicao"));
    }

    private RequestPostProcessor consultorJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_consultor-distribuicao"));
    }
}
