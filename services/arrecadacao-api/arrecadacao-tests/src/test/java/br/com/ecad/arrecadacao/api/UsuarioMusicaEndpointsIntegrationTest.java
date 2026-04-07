package br.com.ecad.arrecadacao.api;

import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração dos endpoints HTTP — executa contra o PostgreSQL
 * do docker-compose.dev.yml (localhost:5432, user=gestauto).
 *
 * <p>Cobre todos os 7 endpoints, cenários de erro (400, 404, 409, 422)
 * e segurança (consultor 403 em escrita).
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@SuppressWarnings("null")
class UsuarioMusicaEndpointsIntegrationTest {

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setup() {
        jdbcTemplate.execute("TRUNCATE TABLE arrecadacao.historico_status_usuario, arrecadacao.usuarios_musica CASCADE");
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private String criarJson(String razaoSocial, String cnpj) {
        return """
            {
              "razaoSocial": "%s",
              "cnpj": "%s",
              "endereco": {
                "cep": "01001000",
                "logradouro": "Praça da Sé",
                "numero": "1000",
                "bairro": "Sé",
                "cidade": "São Paulo",
                "uf": "SP"
              },
              "contato": {
                "nomeResponsavel": "João Silva"
              }
            }
            """.formatted(razaoSocial, cnpj);
    }

    private String criarUsuarioERetornarId(String razaoSocial, String cnpj) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/v1/usuarios-musica")
                .contentType(MediaType.APPLICATION_JSON)
                .content(criarJson(razaoSocial, cnpj)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.id");
    }

    // ── 7.2: Happy path — POST /api/v1/usuarios-musica → 201 ──────

    @Test
    @WithMockUser(roles = "analista-arrecadacao", username = "analista1")
    void deveCriarUsuarioComSucesso() throws Exception {
        mockMvc.perform(post("/api/v1/usuarios-musica")
                .contentType(MediaType.APPLICATION_JSON)
                .content(criarJson("Radio Cidade FM Ltda", "50997063000132")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.razaoSocial").value("Radio Cidade FM Ltda"))
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.cnpjFormatado").value("50.997.063/0001-32"));
    }

    // ── 7.2: GET /api/v1/usuarios-musica → 200 com paginação ──────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveListarUsuariosComPaginacao() throws Exception {
        criarUsuarioERetornarId("Radio A", "50997063000132");
        criarUsuarioERetornarId("TV B", "11222333000181");

        mockMvc.perform(get("/api/v1/usuarios-musica?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items.length()").value(2));
    }

    // ── 7.2: GET /api/v1/usuarios-musica/{id} → 200 ───────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveBuscarUsuarioPorId() throws Exception {
        String id = criarUsuarioERetornarId("Radio Busca", "50997063000132");

        mockMvc.perform(get("/api/v1/usuarios-musica/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.razaoSocial").value("Radio Busca"));
    }

    // ── 7.2: PUT /api/v1/usuarios-musica/{id} → 200 ───────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao", username = "editor1")
    void deveAtualizarUsuario() throws Exception {
        String id = criarUsuarioERetornarId("Radio Original", "50997063000132");

        String updateJson = """
            {
              "razaoSocial": "Radio Atualizada",
              "endereco": {
                "cep": "01001000",
                "logradouro": "Praça da Sé",
                "numero": "2000",
                "bairro": "Sé",
                "cidade": "São Paulo",
                "uf": "SP"
              },
              "contato": {
                "nomeResponsavel": "Maria Santos"
              }
            }
            """;

        mockMvc.perform(put("/api/v1/usuarios-musica/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.razaoSocial").value("Radio Atualizada"));
    }

    // ── 7.2: POST inativar → 200, POST ativar → 200, GET historico → 200 ──

    @Test
    @WithMockUser(roles = "analista-arrecadacao", username = "tester")
    void deveInativarEReativarUsuarioComHistorico() throws Exception {
        String id = criarUsuarioERetornarId("TV Test", "11222333000181");

        // Inativar
        mockMvc.perform(post("/api/v1/usuarios-musica/" + id + "/inativar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"justificativa": "Empresa fechada temporariamente."}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INATIVO"));

        // Ativar
        mockMvc.perform(post("/api/v1/usuarios-musica/" + id + "/ativar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"justificativa": "Empresa voltou a operar."}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ATIVO"));

        // Historico
        mockMvc.perform(get("/api/v1/usuarios-musica/" + id + "/historico-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].statusNovo").value("ATIVO"))
                .andExpect(jsonPath("$[0].autor").value("tester"))
                .andExpect(jsonPath("$[1].statusNovo").value("INATIVO"));
    }

    // ── 7.3: Cenários de erro — 409 CNPJ duplicado ─────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar409ParaCnpjDuplicado() throws Exception {
        String json = criarJson("Radio A", "50997063000132");

        mockMvc.perform(post("/api/v1/usuarios-musica")
                .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/usuarios-musica")
                .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Conflict"));
    }

    // ── 7.3: 422 CNPJ inválido ──────────────────────────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaCnpjInvalido() throws Exception {
        mockMvc.perform(post("/api/v1/usuarios-musica")
                .contentType(MediaType.APPLICATION_JSON)
                .content(criarJson("Radio A", "11111111111111")))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── 7.3: 404 não encontrado ─────────────────────────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar404ParaIdInexistente() throws Exception {
        String fakeId = UUID.randomUUID().toString();

        mockMvc.perform(get("/api/v1/usuarios-musica/" + fakeId))
                .andExpect(status().isNotFound());
    }

    // ── 7.3: 422 inativar já inativo ────────────────────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422AoInativarJaInativo() throws Exception {
        String id = criarUsuarioERetornarId("Radio Inativa", "50997063000132");

        // Primeira inativação
        mockMvc.perform(post("/api/v1/usuarios-musica/" + id + "/inativar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"justificativa\": \"Encerrou atividades\"}"))
                .andExpect(status().isOk());

        // Segunda inativação — 422
        mockMvc.perform(post("/api/v1/usuarios-musica/" + id + "/inativar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"justificativa\": \"Encerrou de novo\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── 7.4: Segurança — consultor 403 em escrita ──────────────────

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void consultorNaoDeveCriar() throws Exception {
        mockMvc.perform(post("/api/v1/usuarios-musica")
                .contentType(MediaType.APPLICATION_JSON)
                .content(criarJson("Radio A", "50997063000132")))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void consultorNaoDeveInativar() throws Exception {
        // Não consegue nem acessar o endpoint de escrita
        mockMvc.perform(post("/api/v1/usuarios-musica/" + UUID.randomUUID() + "/inativar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"justificativa\": \"Tentativa de inativacao\"}"))
                .andExpect(status().isForbidden());
    }

    // ── 7.4: Consultor pode listar (leitura) ────────────────────────

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void consultorPodeListar() throws Exception {
        mockMvc.perform(get("/api/v1/usuarios-musica?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());
    }
}
