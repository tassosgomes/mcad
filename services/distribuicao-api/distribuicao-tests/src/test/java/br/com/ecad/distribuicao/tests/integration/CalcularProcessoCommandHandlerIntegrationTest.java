package br.com.ecad.distribuicao.tests.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.application.commands.CalcularProcessoCommand;
import br.com.ecad.distribuicao.application.commands.handlers.CalcularProcessoCommandHandler;
import br.com.ecad.distribuicao.domain.calculo.ObraOwnership;
import br.com.ecad.distribuicao.domain.calculo.OwnershipSnapshot;
import br.com.ecad.distribuicao.domain.calculo.ParticipacaoOwnership;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.CadastroOwnershipClient;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.org.ecad.audit.sdk.AuditClient;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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
class CalcularProcessoCommandHandlerIntegrationTest {

    private static final UUID OBRA_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID TITULAR_CALCULADO_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");
    private static final UUID TITULAR_PREEXISTENTE_ID = UUID.fromString("00000000-0000-0000-0000-000000000202");

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("postgres")
            .withPassword("postgres");

    @Autowired
    private CalcularProcessoCommandHandler handler;

    @Autowired
    private CreditoRepository creditoRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private CadastroOwnershipClient cadastroOwnershipClient;

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
    void handle_WithSeededCriadoProcess_ShouldPersistCreditsAndMarkProcessCalculated() {
        ProcessoDistribuicao processo = persistProcesso("RADIO", "2026-05", rolPayload(), "1000.00");
        when(cadastroOwnershipClient.buscarOwnership(Set.of(OBRA_ID), Set.of(), "Bearer token"))
                .thenReturn(ownershipSnapshot());

        handler.handle(new CalcularProcessoCommand(processo.getId(), "analista", "Bearer token"));
        entityManager.flush();
        entityManager.clear();

        ProcessoDistribuicao persisted = entityManager.find(ProcessoDistribuicao.class, processo.getId());
        List<Credito> creditos = creditoRepository.findByProcessoId(
                        new CreditoFiltro(processo.getId(), null, null, null),
                        PageRequest.of(0, 10))
                .getContent();
        Integer outboxCount = jdbcTemplate.queryForObject("""
                select count(*)
                from distribuicao.outbox_events
                where type = 'distribuicao.processo.calculado'
                  and subject = ?
                """, Integer.class, processo.getId().toString());

        assertThat(persisted.getStatus()).isEqualTo(StatusProcesso.CALCULADO);
        assertThat(persisted.getTotalExecucoes()).isEqualTo(10);
        assertThat(persisted.getTotalObras()).isEqualTo(1);
        assertThat(persisted.getTotalCreditos()).isEqualTo(1);
        assertThat(persisted.getValorTotalCalculado()).isEqualByComparingTo("1000.00");
        assertThat(creditos).hasSize(1);
        assertThat(creditos.getFirst().getTitularId()).isEqualTo(TITULAR_CALCULADO_ID);
        assertThat(creditos.getFirst().getValorCredito()).isEqualByComparingTo("1000.00");
        assertThat(outboxCount).isOne();
    }

    @Test
    void handle_WithPreexistingCredits_ShouldReplaceRowsWithoutDuplicatingCredits() {
        ProcessoDistribuicao processo = persistProcesso("SHOW", "2026-06", rolPayload(), "500.00");
        creditoRepository.saveAll(List.of(preexistingCredito(processo.getId())));
        when(cadastroOwnershipClient.buscarOwnership(Set.of(OBRA_ID), Set.of(), ""))
                .thenReturn(ownershipSnapshot());
        entityManager.flush();
        entityManager.clear();

        handler.handle(new CalcularProcessoCommand(processo.getId(), "analista", ""));
        entityManager.flush();
        entityManager.clear();

        List<Credito> creditos = creditoRepository.findByProcessoId(
                        new CreditoFiltro(processo.getId(), null, null, null),
                        PageRequest.of(0, 10))
                .getContent();

        assertThat(creditos).hasSize(1);
        assertThat(creditos.getFirst().getTitularId()).isEqualTo(TITULAR_CALCULADO_ID);
        assertThat(creditos.getFirst().getValorCredito()).isEqualByComparingTo("500.00");
    }

    @Test
    void handle_WithMissingCadastroOwnership_ShouldThrowProblemDetailCompatibleBusinessFailure() {
        ProcessoDistribuicao processo = persistProcesso("TV_ABERTA", "2026-07", rolPayload(), "1000.00");
        when(cadastroOwnershipClient.buscarOwnership(any(), any(), any()))
                .thenReturn(new OwnershipSnapshot(List.of(), List.of()));

        assertThatThrownBy(() -> handler.handle(new CalcularProcessoCommand(processo.getId(), "analista", "")))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Titularidade autoral");
    }

    private ProcessoDistribuicao persistProcesso(
            String rubricaSigla,
            String periodo,
            String rolPayload,
            String verbaLiquida) {
        SnapshotRol snapshotRol = new SnapshotRol(
                rubricaSigla,
                periodo,
                UUID.randomUUID(),
                10,
                rolPayload,
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
    }

    private OwnershipSnapshot ownershipSnapshot() {
        return new OwnershipSnapshot(
                List.of(new ObraOwnership(
                        OBRA_ID,
                        "Obra Calculada",
                        List.of(new ParticipacaoOwnership(
                                TITULAR_CALCULADO_ID,
                                "Titular Calculado",
                                CategoriaCredito.AUTORAL,
                                null,
                                new BigDecimal("100.0000"))))),
                List.of());
    }

    private Credito preexistingCredito(UUID processoId) {
        return Credito.calculado(
                processoId,
                TITULAR_PREEXISTENTE_ID,
                "Titular Antigo",
                OBRA_ID,
                "Obra Antiga",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.000000"),
                new BigDecimal("123.45"),
                new BigDecimal("123.45"),
                new BigDecimal("1.000000"),
                Instant.parse("2026-05-07T09:00:00Z"));
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
}
