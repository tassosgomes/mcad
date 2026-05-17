package br.com.ecad.distribuicao.tests.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.infra.persistence.SpringDataProcessoRepository;
import br.com.ecad.distribuicao.infra.persistence.SpringDataSnapshotRolRepository;
import br.com.ecad.distribuicao.infra.persistence.SpringDataSnapshotVerbaRepository;
import br.org.ecad.audit.sdk.AuditClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
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
            "spring.rabbitmq.listener.simple.auto-startup=false"
        })
@AutoConfigureMockMvc
@Testcontainers
@SuppressWarnings("null")
class ProcessoControllerIntegrationTest {

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
    @Autowired SpringDataSnapshotRolRepository rolRepository;
    @Autowired SpringDataSnapshotVerbaRepository verbaRepository;
    @Autowired SpringDataProcessoRepository processoRepository;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @MockBean AuditClient auditClient;
    @MockBean JwtDecoder jwtDecoder;

    private static final String RUBRICA = "RADIO";
    private static final String PERIODO = "2026-03";

    @BeforeEach
    void setUp() {
        // Ordem importa: processos referencia snapshots_rol/verba via FK e
        // outbox_events referencia processos via aggregate_id (sem FK formal,
        // mas limpamos para nao acumular entre testes). Deletar processos antes
        // dos snapshots evita ConstraintViolationException no teardown.
        jdbcTemplate.update("DELETE FROM distribuicao.outbox_events");
        jdbcTemplate.update("DELETE FROM distribuicao.audit_outbox");
        processoRepository.deleteAll();
        rolRepository.deleteAll();
        verbaRepository.deleteAll();
    }

    @Test
    void deveRetornarListaVaziaQuandoNaoHaProcessos() throws Exception {
        mockMvc.perform(get("/api/v1/processos").with(jwtAccess()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());
    }

    @Test
    void deveCriarProcessoComStatusCriado() throws Exception {
        seedSnapshotRol();
        seedSnapshotVerba();

        MvcResult result = mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", RUBRICA, "periodo", PERIODO)))
                .with(jwtAccess()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CRIADO"))
                .andExpect(jsonPath("$.rubricaSigla").value(RUBRICA))
                .andExpect(jsonPath("$.periodo").value(PERIODO))
                .andReturn();

        String processoId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
        assertThat(processoId).isNotBlank();
    }

    @Test
    void deveCriarProcesso409EmDuplicata() throws Exception {
        seedSnapshotRol();
        seedSnapshotVerba();

        // Criar primeiro processo
        mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", RUBRICA, "periodo", PERIODO)))
                .with(jwtAccess()))
                .andExpect(status().isCreated());

        // Tentar criar duplicata — deve retornar 409
        mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", RUBRICA, "periodo", PERIODO)))
                .with(jwtAccess()))
                .andExpect(status().isConflict());
    }

    @Test
    void deveRetornar422ParaTransicaoInvalida() throws Exception {
        seedSnapshotRol();
        seedSnapshotVerba();

        // Criar processo
        MvcResult createResult = mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", RUBRICA, "periodo", PERIODO)))
                .with(jwtAccess()))
                .andExpect(status().isCreated())
                .andReturn();

        String processoId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        // Tentar aprovar processo em CRIADO (deve estar em CALCULADO) — 422
        mockMvc.perform(post("/api/v1/processos/" + processoId + "/aprovar").with(jwtAccess()))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void deveCancelarProcessoComJustificativa() throws Exception {
        seedSnapshotRol();
        seedSnapshotVerba();

        MvcResult createResult = mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", RUBRICA, "periodo", PERIODO)))
                .with(jwtAccess()))
                .andExpect(status().isCreated())
                .andReturn();

        String processoId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(post("/api/v1/processos/" + processoId + "/cancelar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("justificativa", "Cancelado por motivo de teste de integração")))
                .with(jwtAccess()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADO"));
    }

    @Test
    void deveRetornar400ParaJustificativaCurta() throws Exception {
        mockMvc.perform(post("/api/v1/processos/" + UUID.randomUUID() + "/cancelar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("justificativa", "curta")))
                .with(jwtAccess()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveBuscarProcessoPorId() throws Exception {
        seedSnapshotRol();
        seedSnapshotVerba();

        MvcResult createResult = mockMvc.perform(post("/api/v1/processos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("rubricaSigla", RUBRICA, "periodo", PERIODO)))
                .with(jwtAccess()))
                .andExpect(status().isCreated())
                .andReturn();

        String processoId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/v1/processos/" + processoId).with(jwtAccess()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(processoId))
                .andExpect(jsonPath("$.status").value("CRIADO"));
    }

    @Test
    void deveRetornar404ParaProcessoNaoEncontrado() throws Exception {
        mockMvc.perform(get("/api/v1/processos/" + UUID.randomUUID()).with(jwtAccess()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveListarDisponiveisQuandoHaRolEVerba() throws Exception {
        seedSnapshotRol();
        seedSnapshotVerba();

        mockMvc.perform(get("/api/v1/processos/disponiveis").with(jwtAccess()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].rubricaSigla").value(RUBRICA));
    }

    private void seedSnapshotRol() {
        rolRepository.save(new SnapshotRol(RUBRICA, PERIODO, UUID.randomUUID(), 150, "{}", false, Instant.now()));
    }

    private void seedSnapshotVerba() {
        verbaRepository.save(new SnapshotVerba(RUBRICA, PERIODO, BigDecimal.valueOf(100000),
                BigDecimal.valueOf(5000), BigDecimal.valueOf(2000), BigDecimal.valueOf(93000), Instant.now()));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor jwtAccess() {
        return jwt().jwt(j -> j.subject("analista@ecad.org").claim("sid", "sess-1"));
    }
}
