package br.com.ecad.arrecadacao.api;

import br.com.ecad.arrecadacao.application.dto.AtualizarRubricaRequest;
import br.com.ecad.arrecadacao.application.dto.CriarRubricaRequest;
import br.com.ecad.arrecadacao.application.dto.InativarRubricaRequest;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
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

import java.util.UUID;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.amqp.rabbit.core.RabbitTemplate;

@SpringBootTest(
        classes = br.com.ecad.arrecadacao.api.ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@AutoConfigureMockMvc
@Transactional
@SuppressWarnings("null")
class RubricaEndpointsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired SpringDataRubricaRepository rubricaRepository;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void criarRubrica_DeveRetornar201ComLocation() throws Exception {
        var request = new CriarRubricaRequest("Podcast", false, null);
        mockMvc.perform(post("/api/v1/rubricas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern("/api/v1/rubricas/.*")))
                .andExpect(jsonPath("$.sigla").value("PODCAST"))
                .andExpect(jsonPath("$.ativo").value(true));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void criarRubricaComSiglaExplicita_DeveUsarSiglaFornecida() throws Exception {
        var request = new CriarRubricaRequest("Streaming de Áudio", true, "STREAM_AUDIO");
        mockMvc.perform(post("/api/v1/rubricas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sigla").value("STREAM_AUDIO"))
                .andExpect(jsonPath("$.exigeClassificacao").value(true));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void criarRubricaComSiglaDuplicada_DeveRetornar400() throws Exception {
        var rubrica = new Rubrica(UUID.randomUUID(), "DUP", "Duplicada", false);
        rubricaRepository.saveAndFlush(rubrica);

        var request = new CriarRubricaRequest("Duplicada", false, "DUP");
        mockMvc.perform(post("/api/v1/rubricas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void buscarRubricaPorId_DeveRetornar200() throws Exception {
        var rubrica = new Rubrica(UUID.randomUUID(), "BUSCA", "Busca", false);
        rubricaRepository.saveAndFlush(rubrica);

        mockMvc.perform(get("/api/v1/rubricas/{id}", rubrica.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(rubrica.getId().toString()))
                .andExpect(jsonPath("$.sigla").value("BUSCA"))
                .andExpect(jsonPath("$.ativo").value(true));
    }

    @Test
    @WithMockUser
    void buscarRubricaInexistente_DeveRetornar404() throws Exception {
        mockMvc.perform(get("/api/v1/rubricas/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void atualizarRubrica_DeveRetornar200ComDadosAtualizados() throws Exception {
        var rubrica = new Rubrica(UUID.randomUUID(), "ATUAL", "Atual", false);
        rubricaRepository.saveAndFlush(rubrica);

        var request = new AtualizarRubricaRequest("Atualizado", true);
        mockMvc.perform(put("/api/v1/rubricas/{id}", rubrica.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Atualizado"))
                .andExpect(jsonPath("$.exigeClassificacao").value(true));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void inativarRubrica_DeveMudarStatusParaFalse() throws Exception {
        var rubrica = new Rubrica(UUID.randomUUID(), "INAT", "Inativar", false);
        rubricaRepository.saveAndFlush(rubrica);

        var request = new InativarRubricaRequest("Rubrica obsoleta");
        mockMvc.perform(post("/api/v1/rubricas/{id}/inativar", rubrica.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void ativarRubricaInativa_DeveMudarStatusParaTrue() throws Exception {
        var rubrica = new Rubrica(UUID.randomUUID(), "ATIVAR", "Ativar", false, false);
        rubricaRepository.saveAndFlush(rubrica);

        var request = new InativarRubricaRequest("Reativacao solicitada");
        mockMvc.perform(post("/api/v1/rubricas/{id}/ativar", rubrica.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(true));
    }

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void criarRubricaComConsultor_DeveRetornar403() throws Exception {
        var request = new CriarRubricaRequest("Proibido", false, null);
        mockMvc.perform(post("/api/v1/rubricas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void listarRubricas_DeveRetornar200() throws Exception {
        mockMvc.perform(get("/api/v1/rubricas"))
                .andExpect(status().isOk());
    }
}
