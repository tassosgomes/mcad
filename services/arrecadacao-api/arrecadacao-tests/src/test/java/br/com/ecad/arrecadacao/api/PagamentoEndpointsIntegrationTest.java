package br.com.ecad.arrecadacao.api;

import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.com.ecad.arrecadacao.infra.persistence.JpaPagamentoRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataLicencaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataUsuarioMusicaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = br.com.ecad.arrecadacao.api.ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@AutoConfigureMockMvc
@Transactional
class PagamentoEndpointsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired SpringDataUsuarioMusicaRepository usuarioMusicaRepository;
    @Autowired SpringDataRubricaRepository rubricaRepository;
    @Autowired SpringDataLicencaRepository licencaRepository;
    @Autowired JpaPagamentoRepository pagamentoRepository;
    @Autowired jakarta.persistence.EntityManager entityManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;
    // VerbaService e provido pelo VerbaServiceTestConfig como stub configuravel
    // Nao usar @SpyBean/@MockBean pois invalida o Spring context cache

    private UUID licencaAtivaId;
    private UUID licencaEncerradaId;

    @BeforeEach
    void setUp() {
        // Reset VerbaService stub para evitar que configuracao de um teste afete os seguintes
        br.com.ecad.arrecadacao.config.VerbaServiceTestConfig.ConfigurableVerbaServiceStub.reset();

        var usuario = UsuarioMusica.criar("Empresa Pagamento", "Fantasia",
            Cnpj.criar("08673009000175"),
            Endereco.criar("12345678", "Rua Teste", "1", "", "Bairro", "Cidade", "SP"),
            Contato.criar("Resp", "11999999999", "resp@test.com"));
        usuarioMusicaRepository.saveAndFlush(usuario);

        var rubrica = new Rubrica(UUID.randomUUID(), "RBP", "Rubrica Pagamento", false);
        rubricaRepository.saveAndFlush(rubrica);

        var licencaAtiva = Licenca.criar(usuario.getId(), rubrica.getId(), LocalDate.now(), null);
        licencaRepository.saveAndFlush(licencaAtiva);
        licencaAtivaId = licencaAtiva.getId();

        var licencaEncerrada = Licenca.criar(usuario.getId(), rubrica.getId(), LocalDate.now(), null);
        licencaEncerrada.suspender("para encerrar", "sistema");
        licencaEncerrada.encerrar("encerrada para teste", "sistema");
        licencaRepository.saveAndFlush(licencaEncerrada);
        licencaEncerradaId = licencaEncerrada.getId();
    }

    // ── happy paths ───────────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRegistrarPagamentoERetornar201() throws Exception {
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"2.5\"}", licencaAtivaId);
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.valorBruto").exists())
            .andExpect(jsonPath("$.status").value("CONFIRMADO"))
            .andExpect(jsonPath("$.periodo").isNotEmpty())
            .andExpect(jsonPath("$.licenca.id").value(licencaAtivaId.toString()));
    }

    @Test
    @WithMockUser
    void deveListarPagamentosComPaginacao() throws Exception {
        mockMvc.perform(get("/api/v1/pagamentos")
                .param("page", "0")
                .param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isArray())
            .andExpect(jsonPath("$.metadata.page").value(0));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveBuscarPagamentoPorIdAposRegistro() throws Exception {
        // Arrange — registrar primeiro
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.0\"}", licencaAtivaId);
        var response = mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andReturn();

        String responseBody = response.getResponse().getContentAsString();
        String pagamentoId = objectMapper.readTree(responseBody).get("id").asText();

        // Act & Assert — buscar pelo ID
        mockMvc.perform(get("/api/v1/pagamentos/{id}", pagamentoId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(pagamentoId))
            .andExpect(jsonPath("$.valorBruto").isNotEmpty())
            .andExpect(jsonPath("$.status").value("CONFIRMADO"));
    }

    // ── error scenarios ───────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar404ParaLicencaInexistente() throws Exception {
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.0\"}", UUID.randomUUID());
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaLicencaEncerrada() throws Exception {
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.0\"}", licencaEncerradaId);
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar409ParaPagamentoDuplicadoNoPeriodo() throws Exception {
        // Arrange — primeiro pagamento
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.0\"}", licencaAtivaId);
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        // Act — segundo pagamento no mesmo periodo
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void deveRetornar404ParaPagamentoInexistente() throws Exception {
        mockMvc.perform(get("/api/v1/pagamentos/{id}", UUID.randomUUID()))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar400ParaQuantidadeUdasZero() throws Exception {
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"0\"}", licencaAtivaId);
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void deveRetornar403ParaConsultorAoRegistrarPagamento() throws Exception {
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.0\"}", licencaAtivaId);
        mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    // ── Testes de Estorno (F06) ────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveEstornarPagamentoConfirmadoERetornar200() throws Exception {
        // Arrange — registrar pagamento
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"2.5\"}", licencaAtivaId);
        var response = mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andReturn();
        String pagamentoId = objectMapper.readTree(response.getResponse().getContentAsString()).get("id").asText();

        // Flush e Clear persistence context para mimicar duas requests separadas
        entityManager.flush();
        entityManager.clear();
        entityManager.clear();

        // Act — estornar
        String estornoBody = "{\"justificativa\":\"Pagamento registrado em duplicidade com valor incorreto.\"}";
        mockMvc.perform(post("/api/v1/pagamentos/{id}/estornar", pagamentoId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(estornoBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ESTORNADO"))
            .andExpect(jsonPath("$.justificativaEstorno").value("Pagamento registrado em duplicidade com valor incorreto."))
            .andExpect(jsonPath("$.estornadoPor").isNotEmpty())
            .andExpect(jsonPath("$.estornadoEm").isNotEmpty());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar400ParaJustificativaCurta() throws Exception {
        // Arrange — registrar pagamento
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.0\"}", licencaAtivaId);
        var response = mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andReturn();
        String pagamentoId = objectMapper.readTree(response.getResponse().getContentAsString()).get("id").asText();

        // Act — justificativa < 10 chars
        String estornoBody = "{\"justificativa\":\"curta\"}";
        mockMvc.perform(post("/api/v1/pagamentos/{id}/estornar", pagamentoId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(estornoBody))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar404ParaPagamentoInexistenteAoEstornar() throws Exception {
        String estornoBody = "{\"justificativa\":\"Justificativa valida com mais de dez caracteres.\"}";
        mockMvc.perform(post("/api/v1/pagamentos/{id}/estornar", java.util.UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content(estornoBody))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaPagamentoJaEstornado() throws Exception {
        // Arrange — registrar e estornar uma vez
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.5\"}", licencaAtivaId);
        var response = mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andReturn();
        String pagamentoId = objectMapper.readTree(response.getResponse().getContentAsString()).get("id").asText();

        entityManager.flush();
        entityManager.clear();

        String estornoBody = "{\"justificativa\":\"Primeiro estorno valido com justificativa de tamanho adequado.\"}";
        mockMvc.perform(post("/api/v1/pagamentos/{id}/estornar", pagamentoId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(estornoBody))
            .andExpect(status().isOk());

        entityManager.flush();
        entityManager.clear();

        // Act — segundo estorno deve falhar com 422
        mockMvc.perform(post("/api/v1/pagamentos/{id}/estornar", pagamentoId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(estornoBody))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaVerbaEmDistribuicao() throws Exception {
        // Arrange — registrar pagamento
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.0\"}", licencaAtivaId);
        var response = mockMvc.perform(post("/api/v1/pagamentos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andReturn();
        String pagamentoId = objectMapper.readTree(response.getResponse().getContentAsString()).get("id").asText();

        // Configurar stub: VerbaService lanca VerbaEmDistribuicaoException
        br.com.ecad.arrecadacao.config.VerbaServiceTestConfig.ConfigurableVerbaServiceStub.forceVerbaLock();
        entityManager.flush();
        entityManager.clear();

        // Act
        String estornoBody = "{\"justificativa\":\"Justificativa valida com mais de dez caracteres.\"}";
        mockMvc.perform(post("/api/v1/pagamentos/{id}/estornar", pagamentoId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(estornoBody))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void deveRetornar403ParaConsultorAoEstornar() throws Exception {
        String estornoBody = "{\"justificativa\":\"Justificativa valida com mais de dez caracteres.\"}";
        mockMvc.perform(post("/api/v1/pagamentos/{id}/estornar", java.util.UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content(estornoBody))
            .andExpect(status().isForbidden());
    }
}
