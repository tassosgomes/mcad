package br.com.ecad.distribuicao.tests.integration;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.ecad.distribuicao.api.DistribuicaoApiApplication;
import br.com.ecad.distribuicao.domain.entities.Rubrica;
import br.com.ecad.distribuicao.infra.persistence.SpringDataRubricaRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
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
class RubricaControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("postgres")
            .withPassword("postgres");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SpringDataRubricaRepository springDataRubricaRepository;

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
        springDataRubricaRepository.deleteAll();
    }

    @Test
    void deveListarRubricasQuandoExistemDados() throws Exception {
        springDataRubricaRepository.saveAll(List.of(
                Rubrica.criar("RADIO", "Rádio AM/FM", false),
                Rubrica.criar("TV_ABERTA", "TV Aberta", true)));

        mockMvc.perform(get("/api/v1/rubricas").with(jwtComScopeAccess()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sigla").value("RADIO"))
                .andExpect(jsonPath("$[1].sigla").value("TV_ABERTA"));
    }

    @Test
    void deveRetornarListaVaziaQuandoNaoHaRubricas() throws Exception {
        mockMvc.perform(get("/api/v1/rubricas").with(jwtComScopeAccess()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void deveBuscarRubricaPorSigla() throws Exception {
        springDataRubricaRepository.save(Rubrica.criar("TV_ABERTA", "TV Aberta", true));

        mockMvc.perform(get("/api/v1/rubricas/TV_ABERTA").with(jwtComScopeAccess()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sigla").value("TV_ABERTA"))
                .andExpect(jsonPath("$.exigeClassificacao").value(true));
    }

    @Test
    void deveRetornar404QuandoRubricaNaoExiste() throws Exception {
        mockMvc.perform(get("/api/v1/rubricas/INEXISTENTE").with(jwtComScopeAccess()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Resource Not Found"))
                .andExpect(jsonPath("$.detail").value("Rubrica com sigla 'INEXISTENTE' não foi encontrada"));
    }

    @Test
    void deveRetornar405ParaPost() throws Exception {
        mockMvc.perform(post("/api/v1/rubricas").with(jwtComScopeAccess()))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.title").value("Method Not Allowed"));
    }

    @Test
    void deveRetornar401SemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/v1/rubricas"))
                .andExpect(status().isUnauthorized());
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor jwtComScopeAccess() {
        return jwt().authorities(new SimpleGrantedAuthority("SCOPE_access"));
    }
}
