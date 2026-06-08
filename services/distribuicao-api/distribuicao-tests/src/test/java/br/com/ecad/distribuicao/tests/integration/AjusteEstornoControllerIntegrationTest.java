package br.com.ecad.distribuicao.tests.integration;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.EventoEstorno;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
        classes = DistribuicaoApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
            "app.security.auth-enabled=true",
            "spring.autoconfigure.exclude=br.org.ecad.audit.starter.AuditAutoConfiguration",
            "ecad.authz.enabled=false",
            "spring.rabbitmq.listener.simple.auto-startup=false",
            "otel.sdk.disabled=true",
            "management.tracing.enabled=false"
        })
@AutoConfigureMockMvc
@Testcontainers
@Transactional
@SuppressWarnings("null")
class AjusteEstornoControllerIntegrationTest {

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

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AjusteEstornoRepository ajusteEstornoRepository;

    @Autowired
    private ProcessoRepository processoRepository;

    @MockBean
    private AuditClient auditClient;

    @MockBean
    private JwtDecoder jwtDecoder;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private AjusteEstorno ajustePendente;
    private AjusteEstorno ajusteIgnorado;

    @BeforeEach
    void setUp() {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                "RADIO", "2026-05", new BigDecimal("1000.00"), "analista", null, null);
        processoRepository.save(processo);

        EventoEstorno evento1 = eventoEstorno(UUID.randomUUID(), UUID.randomUUID(), "RADIO", "2026-05");
        ajustePendente = AjusteEstorno.pendente(evento1, processo, "{\"test\":1}", new BigDecimal("85.00"));
        ajusteEstornoRepository.save(ajustePendente);

        EventoEstorno evento2 = eventoEstorno(UUID.randomUUID(), UUID.randomUUID(), "RADIO", "2026-05");
        ajusteIgnorado = AjusteEstorno.ignoradoSemDistribuicao(evento2, "{}", new BigDecimal("50.00"));
        ajusteEstornoRepository.save(ajusteIgnorado);
    }

    @Test
    void listar_SemFiltros_Retorna200Paginado() throws Exception {
        mockMvc.perform(get("/api/v1/ajustes-estorno")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());
    }

    @Test
    void listar_ComFiltroStatusPendenteAplicacao_RetornaApenasCorrespondentes() throws Exception {
        mockMvc.perform(get("/api/v1/ajustes-estorno")
                        .param("status", "PENDENTE_APLICACAO")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());
    }

    @Test
    void listar_ComFiltroRubricaEPeriodo_Retorna200() throws Exception {
        mockMvc.perform(get("/api/v1/ajustes-estorno")
                        .param("rubrica", "RADIO")
                        .param("periodoOrigem", "2026-05")
                        .with(jwt()))
                .andExpect(status().isOk());
    }

    @Test
    void buscarPorId_ComIdValido_Retorna200ComDetalhe() throws Exception {
        mockMvc.perform(get("/api/v1/ajustes-estorno/{id}", ajustePendente.getId())
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ajustePendente.getId().toString()))
                .andExpect(jsonPath("$.status").value("PENDENTE_APLICACAO"))
                .andExpect(jsonPath("$.payloadOriginal").exists());
    }

    @Test
    void buscarPorId_ComIdInexistente_Retorna404() throws Exception {
        mockMvc.perform(get("/api/v1/ajustes-estorno/{id}", UUID.randomUUID())
                        .with(jwt()))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private EventoEstorno eventoEstorno(UUID eventId, UUID pagamentoId, String rubrica, String periodo) {
        return new EventoEstorno(
                eventId,
                pagamentoId,
                UUID.randomUUID(),
                rubrica,
                periodo,
                new BigDecimal("10.000000"),
                new BigDecimal("100.00"),
                "Justificativa de teste",
                "analista@ecad.org",
                Instant.parse("2026-06-01T10:00:00Z"));
    }
}
