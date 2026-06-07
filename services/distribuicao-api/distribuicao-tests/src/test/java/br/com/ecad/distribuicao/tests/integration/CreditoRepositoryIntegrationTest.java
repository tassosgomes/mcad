package br.com.ecad.distribuicao.tests.integration;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.enums.SubcategoriaConexa;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.projections.TitularDemonstrativoProjection;
import br.org.ecad.audit.sdk.AuditClient;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
        classes = DistribuicaoApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
            "app.security.auth-enabled=false",
            "spring.autoconfigure.exclude=br.org.ecad.audit.starter.AuditAutoConfiguration",
            "spring.rabbitmq.listener.simple.auto-startup=false"
        })
@Testcontainers
@Transactional
@SuppressWarnings("null")
class CreditoRepositoryIntegrationTest {

    private static final UUID TITULAR_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID TITULAR_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000102");
    private static final UUID OBRA_A_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID OBRA_B_ID = UUID.fromString("00000000-0000-0000-0000-000000000202");
    private static final UUID FONOGRAMA_ID = UUID.fromString("00000000-0000-0000-0000-000000000301");
    private static final Instant CRIADO_EM = Instant.parse("2026-05-07T10:15:30Z");

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("postgres")
            .withPassword("postgres");

    @Autowired
    private CreditoRepository creditoRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private AuditClient auditClient;

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

    @Test
    void flyway_WithCleanPostgres_ShouldCreateCreditTableAndProcessSummaryColumns() {
        Integer creditosTables = countInformationSchemaRows("""
                select count(*)
                from information_schema.tables
                where table_schema = 'distribuicao'
                  and table_name = 'creditos'
                """);
        Integer summaryColumns = countInformationSchemaRows("""
                select count(*)
                from information_schema.columns
                where table_schema = 'distribuicao'
                  and table_name = 'processos'
                  and column_name in (
                      'total_obras',
                      'total_pontos',
                      'total_creditos',
                      'valor_total_calculado'
                  )
                """);

        assertThat(creditosTables).isOne();
        assertThat(summaryColumns).isEqualTo(4);
    }

    @Test
    void deleteByProcessoId_WithCreditsForTwoProcesses_ShouldRemoveOnlyRequestedProcessCredits() {
        ProcessoDistribuicao processoA = persistProcesso("RADIO", "2026-05");
        ProcessoDistribuicao processoB = persistProcesso("TV_ABERTA", "2026-05");
        creditoRepository.saveAll(List.of(
                autoral(processoA.getId(), TITULAR_A_ID, OBRA_A_ID),
                conexo(processoA.getId(), TITULAR_B_ID, OBRA_A_ID),
                autoral(processoB.getId(), TITULAR_A_ID, OBRA_B_ID)));
        entityManager.flush();
        entityManager.clear();

        creditoRepository.deleteByProcessoId(processoA.getId());
        entityManager.flush();
        entityManager.clear();

        assertThat(findCreditos(processoA.getId()).getTotalElements()).isZero();
        assertThat(findCreditos(processoB.getId()).getTotalElements()).isEqualTo(1);
    }

    @Test
    void buscarResumo_WithCalculatedProcess_ShouldReturnCalculationSummaryProjection() {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                "RADIO",
                "2026-05",
                new BigDecimal("1000.00"),
                "analista",
                null,
                null);
        processo.marcarCalculado(
                25,
                2,
                new BigDecimal("40.000000"),
                3,
                new BigDecimal("1000.00"));
        entityManager.persist(processo);
        entityManager.flush();
        entityManager.clear();

        var resumo = creditoRepository.buscarResumo(processo.getId()).orElseThrow();

        assertThat(resumo.processoId()).isEqualTo(processo.getId());
        assertThat(resumo.status()).isEqualTo(StatusProcesso.CALCULADO);
        assertThat(resumo.totalExecucoes()).isEqualTo(25);
        assertThat(resumo.totalObras()).isEqualTo(2);
        assertThat(resumo.totalPontos()).isEqualByComparingTo("40.000000");
        assertThat(resumo.totalCreditos()).isEqualTo(3);
        assertThat(resumo.valorTotalCalculado()).isEqualByComparingTo("1000.00");
        assertThat(resumo.calculadoEm()).isNotNull();
    }

    @Test
    void findTitularesByProcessoId_ShouldReturnGroupedAggregates() {
        ProcessoDistribuicao processo = persistProcesso("RADIO", "2026-05");
        creditoRepository.saveAll(List.of(
                autoral(processo.getId(), TITULAR_A_ID, OBRA_A_ID),
                autoral(processo.getId(), TITULAR_A_ID, OBRA_B_ID),
                conexo(processo.getId(), TITULAR_B_ID, OBRA_A_ID)));
        entityManager.flush();
        entityManager.clear();

        List<TitularDemonstrativoProjection> result = creditoRepository.findTitularesByProcessoId(
                processo.getId(), null, PageRequest.of(0, 10));

        assertThat(result).hasSize(2);
        TitularDemonstrativoProjection tA = result.stream()
                .filter(t -> t.titularId().equals(TITULAR_A_ID)).findFirst().orElseThrow();
        assertThat(tA.titularNome()).isEqualTo("Titular " + TITULAR_A_ID.toString().substring(35));
        assertThat(tA.totalCalculado()).isEqualByComparingTo("2000.00");
        assertThat(tA.totalRetido()).isEqualByComparingTo("0.00");
        assertThat(tA.quantidadeObras()).isEqualTo(2);
    }

    @Test
    void findLiberadosByProcessoLiberacaoAndTitular_ShouldReturnLiberatedCredits() {
        ProcessoDistribuicao processoCalc = persistProcesso("RADIO", "2026-05");
        ProcessoDistribuicao processoLib = persistProcesso("TV_ABERTA", "2026-05");
        Credito c1 = retido(processoCalc.getId(), TITULAR_A_ID, OBRA_A_ID, new BigDecimal("700.00"));
        Credito c2 = retido(processoCalc.getId(), TITULAR_A_ID, OBRA_B_ID, new BigDecimal("300.00"));
        c1.liberar(processoLib.getId(), Instant.now());
        creditoRepository.saveAll(List.of(c1, c2));
        entityManager.flush();
        entityManager.clear();

        List<Credito> liberados = creditoRepository.findLiberadosByProcessoLiberacaoAndTitular(
                processoLib.getId(), TITULAR_A_ID);

        assertThat(liberados).hasSize(1);
        assertThat(liberados.get(0).getStatus()).isEqualTo(StatusCredito.LIBERADO);
        assertThat(liberados.get(0).getProcessoId()).isEqualTo(processoCalc.getId());

        Map<UUID, java.math.BigDecimal> sums = creditoRepository.sumLiberadosByProcessoLiberacaoId(processoLib.getId());
        assertThat(sums).containsOnlyKeys(TITULAR_A_ID);
        assertThat(sums.get(TITULAR_A_ID)).isEqualByComparingTo("1000.00");
    }

    @Test
    void findByProcessoId_WithFiltersAndPagination_ShouldFilterByCategoriaTitularAndObra() {
        ProcessoDistribuicao processo = persistProcesso("RADIO", "2026-05");
        creditoRepository.saveAll(List.of(
                autoral(processo.getId(), TITULAR_A_ID, OBRA_A_ID),
                conexo(processo.getId(), TITULAR_B_ID, OBRA_A_ID),
                autoral(processo.getId(), TITULAR_A_ID, OBRA_B_ID)));
        entityManager.flush();
        entityManager.clear();

        Page<Credito> firstPage = creditoRepository.findByProcessoId(
                new CreditoFiltro(processo.getId(), null, null, null, null, null),
                PageRequest.of(0, 1));
        Page<Credito> autorais = creditoRepository.findByProcessoId(
                new CreditoFiltro(processo.getId(), CategoriaCredito.AUTORAL, null, null, null, null),
                PageRequest.of(0, 10));
        Page<Credito> titularA = creditoRepository.findByProcessoId(
                new CreditoFiltro(processo.getId(), null, TITULAR_A_ID, null, null, null),
                PageRequest.of(0, 10));
        Page<Credito> obraA = creditoRepository.findByProcessoId(
                new CreditoFiltro(processo.getId(), null, null, OBRA_A_ID, null, null),
                PageRequest.of(0, 10));

        assertThat(firstPage.getContent()).hasSize(1);
        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(autorais.getContent())
                .extracting(Credito::getCategoria)
                .containsOnly(CategoriaCredito.AUTORAL);
        assertThat(autorais.getTotalElements()).isEqualTo(2);
        assertThat(titularA.getContent())
                .extracting(Credito::getTitularId)
                .containsOnly(TITULAR_A_ID);
        assertThat(titularA.getTotalElements()).isEqualTo(2);
        assertThat(obraA.getContent())
                .extracting(Credito::getObraId)
                .containsOnly(OBRA_A_ID);
        assertThat(obraA.getTotalElements()).isEqualTo(2);
    }

    private ProcessoDistribuicao persistProcesso(String rubricaSigla, String periodo) {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                rubricaSigla,
                periodo,
                new BigDecimal("1000.00"),
                "analista",
                null,
                null);
        entityManager.persist(processo);
        entityManager.flush();
        return processo;
    }

    private Page<Credito> findCreditos(UUID processoId) {
        return creditoRepository.findByProcessoId(
                new CreditoFiltro(processoId, null, null, null, null, null),
                PageRequest.of(0, 10));
    }

    private Credito autoral(UUID processoId, UUID titularId, UUID obraId) {
        return Credito.calculado(
                processoId,
                titularId,
                "Titular " + titularId.toString().substring(35),
                obraId,
                "Obra " + obraId.toString().substring(35),
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.000000"),
                new BigDecimal("1000.00"),
                new BigDecimal("1000.00"),
                new BigDecimal("10.000000"),
                CRIADO_EM);
    }

    private Credito conexo(UUID processoId, UUID titularId, UUID obraId) {
        return Credito.calculado(
                processoId,
                titularId,
                "Titular Conexo",
                obraId,
                "Obra Conexa",
                FONOGRAMA_ID,
                CategoriaCredito.CONEXO,
                SubcategoriaConexa.INTERPRETE,
                new BigDecimal("50.000000"),
                new BigDecimal("500.00"),
                new BigDecimal("250.00"),
                new BigDecimal("10.000000"),
                CRIADO_EM);
    }

    private Credito retido(UUID processoId, UUID titularId, UUID obraId, BigDecimal valorCredito) {
        return Credito.retido(
                processoId,
                titularId,
                "Titular " + titularId.toString().substring(35),
                obraId,
                "Obra " + obraId.toString().substring(35),
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.000000"),
                new BigDecimal("1000.00"),
                valorCredito,
                new BigDecimal("10.000000"),
                MotivoRetencao.TITULAR_SEM_ASSOCIACAO,
                Instant.now(),
                CRIADO_EM);
    }

    private Integer countInformationSchemaRows(String sql) {
        return jdbcTemplate.queryForObject(sql, Integer.class);
    }
}
