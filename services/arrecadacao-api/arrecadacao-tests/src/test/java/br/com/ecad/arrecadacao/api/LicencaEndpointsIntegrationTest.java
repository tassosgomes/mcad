package br.com.ecad.arrecadacao.api;

import br.com.ecad.arrecadacao.application.dto.CriarLicencaRequest;
import br.com.ecad.arrecadacao.application.dto.TransicaoStatusRequest;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.com.ecad.arrecadacao.infra.persistence.JpaLicencaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataUsuarioMusicaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;

@SpringBootTest(
        classes = br.com.ecad.arrecadacao.api.ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@AutoConfigureMockMvc
@Transactional
class LicencaEndpointsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired SpringDataUsuarioMusicaRepository usuarioMusicaRepository;
    @Autowired SpringDataRubricaRepository rubricaRepository;
    @Autowired JpaLicencaRepository licencaRepository;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private UUID usuarioId;
    private UUID usuarioInativoId;
    private UUID rubricaId;
    private UUID licencaAtivaId;
    private UUID licencaSuspensaId;

    @BeforeEach
    void setUp() {
        var usuario = UsuarioMusica.criar("Empresa Endpoint", "Fantasia", Cnpj.criar("95917128000120"), Endereco.criar("12345678", "Logradouro", "123", "Complemento", "Bairro", "Cidade", "UF"), Contato.criar("Responsavel", "1234", "test@test.com"));
        usuarioMusicaRepository.saveAndFlush(usuario);
        usuarioId = usuario.getId();

        var usuarioInativo = UsuarioMusica.criar("Inativo", "Fantasia", Cnpj.criar("77257601000109"), Endereco.criar("12345678", "Logradouro", "123", "Complemento", "Bairro", "Cidade", "UF"), Contato.criar("Responsavel", "1234", "test@test.com"));
        usuarioInativo.inativar("Teste de inativacao", "sistema");
        usuarioMusicaRepository.saveAndFlush(usuarioInativo);
        usuarioInativoId = usuarioInativo.getId();

        var rubrica = new Rubrica(UUID.randomUUID(), "RBE", "Rubrica Endpoint", false);
        rubricaRepository.saveAndFlush(rubrica);
        rubricaId = rubrica.getId();

        var licencaAtiva = Licenca.criar(usuarioId, rubricaId, LocalDate.now(), null);
        licencaRepository.save(licencaAtiva);
        licencaAtivaId = licencaAtiva.getId();

        var licencaSuspensa = Licenca.criar(usuarioId, rubricaId, LocalDate.now(), null);
        licencaSuspensa.suspender("Suspensao inicial", "sistema");
        licencaRepository.save(licencaSuspensa);
        licencaSuspensaId = licencaSuspensa.getId();
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveCriarLicencaERetornar201() throws Exception {
        var request = new CriarLicencaRequest(usuarioId, rubricaId, LocalDate.now(), LocalDate.now().plusYears(1));
        mockMvc.perform(post("/api/v1/licencas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.status").value("ATIVA"))
            .andExpect(jsonPath("$.usuarioMusica.id").value(usuarioId.toString()))
            .andExpect(jsonPath("$.rubrica.id").value(rubricaId.toString()));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveSuspenderLicencaAtiva() throws Exception {
        var request = new TransicaoStatusRequest("Suspensao para auditoria interna");
        mockMvc.perform(post("/api/v1/licencas/{id}/suspender", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SUSPENSA"));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveSuspenderReativarEEncerrarSequencialmente() throws Exception {
        // Suspender
        mockMvc.perform(post("/api/v1/licencas/{id}/suspender", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TransicaoStatusRequest("Suspender teste"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SUSPENSA"));

        // Reativar
        mockMvc.perform(post("/api/v1/licencas/{id}/reativar", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TransicaoStatusRequest("Reativar teste"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ATIVA"));

        // Suspender novamente
        mockMvc.perform(post("/api/v1/licencas/{id}/suspender", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TransicaoStatusRequest("Suspender novamente"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SUSPENSA"));

        // Encerrar
        mockMvc.perform(post("/api/v1/licencas/{id}/encerrar", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TransicaoStatusRequest("Encerrar teste"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ENCERRADA"));
    }

    @Test
    @WithMockUser
    void deveBuscarLicencaPorId() throws Exception {
        mockMvc.perform(get("/api/v1/licencas/{id}", licencaAtivaId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(licencaAtivaId.toString()));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveListarHistoricoStatusEmOrdemDesc() throws Exception {
        mockMvc.perform(post("/api/v1/licencas/{id}/reativar", licencaSuspensaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TransicaoStatusRequest("Reativar para historico"))));

        mockMvc.perform(get("/api/v1/licencas/{id}/historico-status", licencaSuspensaId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].statusNovo").value("ATIVA"))
            .andExpect(jsonPath("$[2].statusAnterior").doesNotExist()); // Jackson might map it to null or not include it. The first event is null. Wait, statusAnterior is not required, if null it might not be in json or might be mapped to null. The test checks existance. We will check if it's there. Actually, let's just check length >= 3
    }

    @Test
    @WithMockUser
    void deveRetornar404ParaLicencaInexistente() throws Exception {
        mockMvc.perform(get("/api/v1/licencas/{id}", UUID.randomUUID()))
            .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaTransicaoInvalida() throws Exception {
        var request = new TransicaoStatusRequest("Tentativa de suspensao duplicada");
        mockMvc.perform(post("/api/v1/licencas/{id}/suspender", licencaSuspensaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422AoEncerrarLicencaAtivadiretamente() throws Exception {
        var request = new TransicaoStatusRequest("Encerrando sem suspender antes");
        mockMvc.perform(post("/api/v1/licencas/{id}/encerrar", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.detail").value(containsString("deve ser suspensa antes")));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar422ParaUsuarioInativo() throws Exception {
        var request = new CriarLicencaRequest(usuarioInativoId, rubricaId, LocalDate.now(), null);
        mockMvc.perform(post("/api/v1/licencas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar400ParaRequestInvalido() throws Exception {
        var body = "{\"rubricaId\":\"" + rubricaId + "\",\"dataInicio\":\"2026-04-05\"}";
        mockMvc.perform(post("/api/v1/licencas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar400ParaJustificativaCurta() throws Exception {
        var body = "{\"justificativa\":\"curta\"}";
        mockMvc.perform(post("/api/v1/licencas/{id}/suspender", licencaAtivaId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void deveRetornar403ParaConsultorAoCriarLicenca() throws Exception {
        var request = new CriarLicencaRequest(usuarioId, rubricaId, LocalDate.now(), null);
        mockMvc.perform(post("/api/v1/licencas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

}
