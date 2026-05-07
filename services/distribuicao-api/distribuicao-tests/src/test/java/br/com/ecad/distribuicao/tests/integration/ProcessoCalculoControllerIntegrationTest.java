package br.com.ecad.distribuicao.tests.integration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.domain.calculo.ObraOwnership;
import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.calculo.ParticipacaoOwnership;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.interfaces.CadastroOwnershipClient;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
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
            "spring.rabbitmq.listener.simple.auto-startup=false"
        })
@AutoConfigureMockMvc
@Testcontainers
@SuppressWarnings("null")
class ProcessoCalculoControllerIntegrationTest {

    private static final UUID OBRA_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID TITULAR_AUTORAL_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID TITULAR_CONEXO_ID = UUID.fromString("00000000-0000-0000-0000-000000000202");

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
    private CadastroOwnershipClient cadastroOwnershipClient;

    @MockBean
    private JwtDecoder jwtDecoder;

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
        jdbcTemplate.update("delete from distribuicao.processos");
        jdbcTemplate.update("delete from distribuicao.snapshots_rol");
        jdbcTemplate.update("delete from distribuicao.snapshots_verba");
    }

    @Test
    void calcular_WithAnalistaRole_ShouldReturnCalculatedProcessData() throws Exception {
        ProcessoDistribuicao processo = persistCriadoProcesso("RADIO", "2026-05", "1000.00");
        when(cadastroOwnershipClient.buscarOwnership(Set.of(OBRA_ID), Set.of(), ""))
                .thenReturn(ownershipSnapshot());

        mockMvc.perform(post("/api/v1/processos/{id}/calcular", processo.getId())
                        .with(analistaJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processoId").value(processo.getId().toString()))
                .andExpect(jsonPath("$.status").value("CALCULADO"))
                .andExpect(jsonPath("$.rubricaSigla").value("RADIO"))
                .andExpect(jsonPath("$.periodo").value("2026-05"))
                .andExpect(jsonPath("$.totalExecucoes").value(10))
                .andExpect(jsonPath("$.totalObras").value(1))
                .andExpect(jsonPath("$.totalCreditos").value(1))
                .andExpect(jsonPath("$.valorTotalCalculado").value(1000.00));
    }

    @Test
    void calcular_WithConsultorRole_ShouldReturnForbidden() throws Exception {
        ProcessoDistribuicao processo = persistCriadoProcesso("SHOW", "2026-06", "500.00");

        mockMvc.perform(post("/api/v1/processos/{id}/calcular", processo.getId()).with(consultorJwt()))
                .andExpect(status().isForbidden());
    }

    @Test
    void consultar_WithCalculatedProcess_ShouldReturnSummaryAndPaginatedCredits() throws Exception {
        ProcessoDistribuicao processo = persistCalculatedProcess("RADIO", "2026-07");

        mockMvc.perform(get("/api/v1/processos/{id}/calculo", processo.getId()).with(consultorJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processoId").value(processo.getId().toString()))
                .andExpect(jsonPath("$.status").value("CALCULADO"))
                .andExpect(jsonPath("$.rubricaSigla").value("RADIO"))
                .andExpect(jsonPath("$.periodo").value("2026-07"))
                .andExpect(jsonPath("$.resumo.verbaLiquida").value(1000.00))
                .andExpect(jsonPath("$.resumo.totalExecucoes").value(10))
                .andExpect(jsonPath("$.resumo.totalObras").value(1))
                .andExpect(jsonPath("$.resumo.totalCreditos").value(2))
                .andExpect(jsonPath("$.resumo.valorTotalCalculado").value(1000.00))
                .andExpect(jsonPath("$.creditos.items").isArray())
                .andExpect(jsonPath("$.creditos.items.length()").value(2))
                .andExpect(jsonPath("$.creditos.metadata.page").value(0))
                .andExpect(jsonPath("$.creditos.metadata.size").value(20))
                .andExpect(jsonPath("$.creditos.metadata.total").value(2))
                .andExpect(jsonPath("$.creditos.metadata.totalPages").value(1));
    }

    @Test
    void consultar_WithCategoriaAndSizeFilter_ShouldReturnFilteredMetadataAndItems() throws Exception {
        ProcessoDistribuicao processo = persistCalculatedProcess("TV_ABERTA", "2026-08");

        mockMvc.perform(get("/api/v1/processos/{id}/calculo", processo.getId())
                        .param("categoria", "AUTORAL")
                        .param("size", "1")
                        .with(analistaJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.creditos.items.length()").value(1))
                .andExpect(jsonPath("$.creditos.items[0].categoria").value("AUTORAL"))
                .andExpect(jsonPath("$.creditos.items[0].titularId").value(TITULAR_AUTORAL_ID.toString()))
                .andExpect(jsonPath("$.creditos.metadata.page").value(0))
                .andExpect(jsonPath("$.creditos.metadata.size").value(1))
                .andExpect(jsonPath("$.creditos.metadata.total").value(1))
                .andExpect(jsonPath("$.creditos.metadata.totalPages").value(1));
    }

    @Test
    void consultar_WithUnknownProcess_ShouldReturn404ProblemDetail() throws Exception {
        UUID unknownProcessId = UUID.fromString("00000000-0000-0000-0000-000000000999");

        mockMvc.perform(get("/api/v1/processos/{id}/calculo", unknownProcessId).with(analistaJwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Resource Not Found"))
                .andExpect(jsonPath("$.detail").value(
                        "Processo de distribuição não encontrado: " + unknownProcessId));
    }

    @Test
    void calcular_WithInvalidPrecondition_ShouldReturn422ProblemDetail() throws Exception {
        ProcessoDistribuicao processo = persistCriadoProcesso("STREAMING", "2026-09", "1000.00");
        when(cadastroOwnershipClient.buscarOwnership(any(), any(), any()))
                .thenReturn(new OwnershipSnapshot(List.of(), List.of()));

        mockMvc.perform(post("/api/v1/processos/{id}/calcular", processo.getId()).with(analistaJwt()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.title").value("Calculation Preconditions Failed"));
    }

    private ProcessoDistribuicao persistCriadoProcesso(
            String rubricaSigla,
            String periodo,
            String verbaLiquida) {
        return transactionTemplate.execute(status -> {
            SnapshotRol snapshotRol = new SnapshotRol(
                    rubricaSigla,
                    periodo,
                    UUID.randomUUID(),
                    10,
                    rolPayload(),
                    false,
                    Instant.parse("2026-05-07T10:15:30Z"));
            SnapshotVerba snapshotVerba = new SnapshotVerba(
                    rubricaSigla,
                    periodo,
                    new BigDecimal(verbaLiquida),
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    new BigDecimal(verbaLiquida),
                    Instant.parse("2026-05-07T10:16:30Z"));
            entityManager.persist(snapshotRol);
            entityManager.persist(snapshotVerba);
            entityManager.flush();

            ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                    rubricaSigla,
                    periodo,
                    new BigDecimal(verbaLiquida),
                    "analista",
                    snapshotRol.getId(),
                    snapshotVerba.getId());
            entityManager.persist(processo);
            entityManager.flush();
            return processo;
        });
    }

    private ProcessoDistribuicao persistCalculatedProcess(String rubricaSigla, String periodo) {
        return transactionTemplate.execute(status -> {
            ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                    rubricaSigla,
                    periodo,
                    new BigDecimal("1000.00"),
                    "analista",
                    null,
                    null);
            entityManager.persist(processo);
            entityManager.flush();
            processo.marcarCalculado(
                    10,
                    1,
                    new BigDecimal("10.000000"),
                    2,
                    new BigDecimal("1000.00"));
            entityManager.persist(autoralCredito(processo.getId()));
            entityManager.persist(conexoCredito(processo.getId()));
            entityManager.flush();
            return processo;
        });
    }

    private OwnershipSnapshot ownershipSnapshot() {
        return new OwnershipSnapshot(
                List.of(new ObraOwnership(
                        OBRA_ID,
                        "Obra Calculada",
                        List.of(new ParticipacaoOwnership(
                                TITULAR_AUTORAL_ID,
                                "Titular Autoral",
                                CategoriaCredito.AUTORAL,
                                null,
                                new BigDecimal("100.0000"))))),
                List.of());
    }

    private Credito autoralCredito(UUID processoId) {
        return Credito.calculado(
                processoId,
                TITULAR_AUTORAL_ID,
                "Titular Autoral",
                OBRA_ID,
                "Obra Calculada",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.000000"),
                new BigDecimal("700.00"),
                new BigDecimal("700.00"),
                new BigDecimal("10.000000"),
                Instant.parse("2026-05-07T10:30:00Z"));
    }

    private Credito conexoCredito(UUID processoId) {
        return Credito.calculado(
                processoId,
                TITULAR_CONEXO_ID,
                "Titular Conexo",
                OBRA_ID,
                "Obra Calculada",
                UUID.fromString("00000000-0000-0000-0000-000000000301"),
                CategoriaCredito.CONEXO,
                br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa.INTERPRETE,
                new BigDecimal("100.000000"),
                new BigDecimal("300.00"),
                new BigDecimal("300.00"),
                new BigDecimal("10.000000"),
                Instant.parse("2026-05-07T10:31:00Z"));
    }

    private String rolPayload() {
        return """
                {
                  "Execucoes": [
                    {
                      "ObraId": "%s",
                      "Quantidade": 10,
                      "Peso": 1.0,
                      "ObraTitulo": "Obra Calculada"
                    }
                  ]
                }
                """.formatted(OBRA_ID);
    }

    private RequestPostProcessor analistaJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_analista-distribuicao"));
    }

    private RequestPostProcessor consultorJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_consultor-distribuicao"));
    }
}
