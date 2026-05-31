package br.com.ecad.arrecadacao.api;

import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataLicencaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataUsuarioMusicaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@AutoConfigureMockMvc
@Transactional
@SuppressWarnings("null")
class ActorContractEndpointsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired SpringDataUsuarioMusicaRepository usuarioMusicaRepository;
    @Autowired SpringDataRubricaRepository rubricaRepository;
    @Autowired SpringDataLicencaRepository licencaRepository;
    @Autowired jakarta.persistence.EntityManager entityManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @BeforeEach
    void setUp() {
        VerbaServiceTestConfig.ConfigurableVerbaServiceStub.reset();
    }

    @Test
    @WithMockUser(username = "actor-contract-active", roles = "analista-arrecadacao")
    void licencaHistory_WithActiveActorProjection_ShouldExposeLegacyAuthorAndActor() throws Exception {
        // Arrange
        insertIdentityUser(
                "actor-contract-active",
                "maria.silva",
                "Maria Silva",
                "maria.silva@mcad.dev",
                false,
                null);
        UUID usuarioId = criarUsuarioMusicaFixture("Empresa Licenca Actor", "95917128000120");
        UUID rubricaId = criarRubricaFixture("ACL");
        String body = """
                {
                  "usuarioMusicaId": "%s",
                  "rubricaId": "%s",
                  "dataInicio": "%s"
                }
                """.formatted(usuarioId, rubricaId, LocalDate.now());

        // Act
        String licencaId = objectMapper.readTree(mockMvc.perform(post("/api/v1/licencas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString())
                .get("id")
                .asText();

        // Assert
        mockMvc.perform(get("/api/v1/licencas/{id}/historico-status", licencaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].autor").value("Maria Silva (maria.silva)"))
                .andExpect(jsonPath("$[0].ator.subject").value("actor-contract-active"))
                .andExpect(jsonPath("$[0].ator.label").value("Maria Silva (maria.silva)"))
                .andExpect(jsonPath("$[0].ator.username").value("maria.silva"))
                .andExpect(jsonPath("$[0].ator.displayName").value("Maria Silva"))
                .andExpect(jsonPath("$[0].ator.status").value("ATIVO"));
    }

    @Test
    @WithMockUser(username = "actor-contract-missing", roles = "analista-arrecadacao")
    void licencaHistory_WhenLookupProjectionIsMissing_ShouldReturnUnknownFallback() throws Exception {
        // Arrange
        UUID usuarioId = criarUsuarioMusicaFixture("Empresa Licenca Missing", "77257601000109");
        UUID rubricaId = criarRubricaFixture("LCM");
        String body = """
                {
                  "usuarioMusicaId": "%s",
                  "rubricaId": "%s",
                  "dataInicio": "%s"
                }
                """.formatted(usuarioId, rubricaId, LocalDate.now());

        // Act
        String licencaId = objectMapper.readTree(mockMvc.perform(post("/api/v1/licencas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString())
                .get("id")
                .asText();

        // Assert
        mockMvc.perform(get("/api/v1/licencas/{id}/historico-status", licencaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].autor").value("actor-contract-missing"))
                .andExpect(jsonPath("$[0].ator.subject").value("actor-contract-missing"))
                .andExpect(jsonPath("$[0].ator.label").value("actor-contract-missing"))
                .andExpect(jsonPath("$[0].ator.status").value("DESCONHECIDO"));
    }

    @Test
    @WithMockUser(username = "actor-contract-suspended", roles = "analista-arrecadacao")
    void usuarioMusicaHistory_WithSuspendedActorProjection_ShouldExposeSuspendedStatus() throws Exception {
        // Arrange
        insertIdentityUser(
                "actor-contract-suspended",
                "joao.souza",
                "Joao Souza",
                "joao.souza@mcad.dev",
                true,
                null);

        // Act
        String usuarioId = objectMapper.readTree(mockMvc.perform(post("/api/v1/usuarios-musica")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(criarUsuarioMusicaJson("Radio Actor Suspenso", "50997063000132")))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString())
                .get("id")
                .asText();

        // Assert
        mockMvc.perform(get("/api/v1/usuarios-musica/{id}/historico-status", usuarioId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].autor").value("Joao Souza (joao.souza)"))
                .andExpect(jsonPath("$[0].ator.subject").value("actor-contract-suspended"))
                .andExpect(jsonPath("$[0].ator.label").value("Joao Souza (joao.souza)"))
                .andExpect(jsonPath("$[0].ator.status").value("SUSPENSO"));
    }

    @Test
    @WithMockUser(username = "actor-contract-removed-uda", roles = "analista-arrecadacao")
    void udaEndpoints_WithRemovedActorProjection_ShouldExposeCriadoPorAtor() throws Exception {
        // Arrange
        jdbcTemplate.update("DELETE FROM arrecadacao.uda_valor WHERE data_vigencia <= CURRENT_DATE");
        insertIdentityUser(
                "actor-contract-removed-uda",
                "ana.removida",
                "Ana Removida",
                "ana.removida@mcad.dev",
                false,
                Instant.parse("2026-05-01T10:15:30Z"));
        String dataVigencia = LocalDate.now().minusDays(1).toString();
        String body = """
                {
                  "valor": "123.45",
                  "dataVigencia": "%s"
                }
                """.formatted(dataVigencia);

        // Act
        mockMvc.perform(post("/api/v1/uda")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Assert
        mockMvc.perform(get("/api/v1/uda/vigente"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criadoPor").value("Ana Removida (ana.removida)"))
                .andExpect(jsonPath("$.criadoPorAtor.subject").value("actor-contract-removed-uda"))
                .andExpect(jsonPath("$.criadoPorAtor.label").value("Ana Removida (ana.removida)"))
                .andExpect(jsonPath("$.criadoPorAtor.status").value("REMOVIDO"));

        mockMvc.perform(get("/api/v1/uda/historico"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].criadoPor").value("Ana Removida (ana.removida)"))
                .andExpect(jsonPath("$[0].criadoPorAtor.status").value("REMOVIDO"));
    }

    @Test
    @WithMockUser(username = "actor-contract-removed-payment", roles = "analista-arrecadacao")
    void pagamentoEndpoints_WithRemovedActorProjection_ShouldExposeEstornadoPorAtor() throws Exception {
        // Arrange
        insertIdentityUser(
                "actor-contract-removed-payment",
                "carlos.removido",
                "Carlos Removido",
                "carlos.removido@mcad.dev",
                false,
                Instant.parse("2026-05-01T10:15:30Z"));
        String razaoSocial = "Empresa Pagamento Actor " + UUID.randomUUID();
        UUID licencaId = criarLicencaFixture(razaoSocial, "08673009000175", "PAG");
        String registrarBody = """
                {
                  "licencaId": "%s",
                  "quantidadeUdas": "2.5"
                }
                """.formatted(licencaId);

        String pagamentoId = objectMapper.readTree(mockMvc.perform(post("/api/v1/pagamentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registrarBody))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString())
                .get("id")
                .asText();

        entityManager.flush();
        entityManager.clear();

        // Act
        mockMvc.perform(post("/api/v1/pagamentos/{id}/estornar", pagamentoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"justificativa\":\"Pagamento duplicado para teste de contrato.\"}"))
                .andExpect(status().isOk());

        entityManager.flush();
        entityManager.clear();

        // Assert
        mockMvc.perform(get("/api/v1/pagamentos/{id}", pagamentoId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estornadoPor").value("Carlos Removido (carlos.removido)"))
                .andExpect(jsonPath("$.estornadoPorAtor.subject").value("actor-contract-removed-payment"))
                .andExpect(jsonPath("$.estornadoPorAtor.label").value("Carlos Removido (carlos.removido)"))
                .andExpect(jsonPath("$.estornadoPorAtor.status").value("REMOVIDO"));

        mockMvc.perform(get("/api/v1/pagamentos")
                        .param("razaoSocial", razaoSocial)
                        .param("status", "ESTORNADO")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].estornadoPor").value("Carlos Removido (carlos.removido)"))
                .andExpect(jsonPath("$.items[0].estornadoPorAtor.status").value("REMOVIDO"));
    }

    private UUID criarLicencaFixture(String razaoSocial, String cnpj, String rubricaSigla) {
        UUID usuarioId = criarUsuarioMusicaFixture(razaoSocial, cnpj);
        UUID rubricaId = criarRubricaFixture(rubricaSigla);
        var licenca = Licenca.criar(usuarioId, rubricaId, LocalDate.now(), null);
        licencaRepository.saveAndFlush(licenca);
        return licenca.getId();
    }

    private UUID criarUsuarioMusicaFixture(String razaoSocial, String cnpj) {
        var usuario = UsuarioMusica.criar(
                razaoSocial,
                "Fantasia",
                Cnpj.criar(cnpj),
                Endereco.criar("12345678", "Rua Teste", "1", "", "Bairro", "Cidade", "SP"),
                Contato.criar("Resp", "11999999999", "resp@mcad.dev"));
        usuarioMusicaRepository.saveAndFlush(usuario);
        return usuario.getId();
    }

    private UUID criarRubricaFixture(String sigla) {
        var rubrica = new Rubrica(UUID.randomUUID(), sigla, "Rubrica " + sigla, false);
        rubricaRepository.saveAndFlush(rubrica);
        return rubrica.getId();
    }

    private String criarUsuarioMusicaJson(String razaoSocial, String cnpj) {
        return """
                {
                  "razaoSocial": "%s",
                  "cnpj": "%s",
                  "endereco": {
                    "cep": "01001000",
                    "logradouro": "Praca da Se",
                    "numero": "1000",
                    "bairro": "Se",
                    "cidade": "Sao Paulo",
                    "uf": "SP"
                  },
                  "contato": {
                    "nomeResponsavel": "Joao Silva"
                  }
                }
                """.formatted(razaoSocial, cnpj);
    }

    private void insertIdentityUser(
            String subject,
            String username,
            String displayName,
            String email,
            boolean suspended,
            Instant deletedAt
    ) {
        jdbcTemplate.update("""
                INSERT INTO arrecadacao.usuarios_identidade (
                    logto_user_id,
                    username,
                    display_name,
                    email,
                    roles,
                    is_suspended,
                    deleted_at_utc,
                    raw_payload,
                    last_event_id,
                    last_event_type,
                    last_event_occurred_at_utc
                )
                VALUES (?, ?, ?, ?, '[]'::jsonb, ?, ?, '{}'::jsonb, ?, 'identity.user.updated', NOW())
                ON CONFLICT (logto_user_id) DO UPDATE SET
                    username = EXCLUDED.username,
                    display_name = EXCLUDED.display_name,
                    email = EXCLUDED.email,
                    is_suspended = EXCLUDED.is_suspended,
                    deleted_at_utc = EXCLUDED.deleted_at_utc,
                    updated_at_utc = NOW()
                """,
                subject,
                username,
                displayName,
                email,
                suspended,
                deletedAt == null ? null : Timestamp.from(deletedAt),
                "evt-" + subject);
    }
}
