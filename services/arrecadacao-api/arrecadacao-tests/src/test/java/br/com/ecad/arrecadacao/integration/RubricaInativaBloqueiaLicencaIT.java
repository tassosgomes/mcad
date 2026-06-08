package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.application.dto.CriarLicencaRequest;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataUsuarioMusicaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.amqp.rabbit.core.RabbitTemplate;

@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@AutoConfigureMockMvc
@Transactional
@SuppressWarnings("null")
class RubricaInativaBloqueiaLicencaIT {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired SpringDataRubricaRepository rubricaRepository;
    @Autowired SpringDataUsuarioMusicaRepository usuarioMusicaRepository;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private UUID usuarioId;
    private UUID rubricaInativaId;

    @BeforeEach
    void setUp() {
        var usuario = UsuarioMusica.criar("Empresa Teste", "Fantasia",
                Cnpj.criar("95917128000120"),
                Endereco.criar("12345678", "Rua Teste", "1", "", "Bairro", "Cidade", "SP"),
                Contato.criar("Resp", "11999999999", "resp@test.com"));
        usuarioMusicaRepository.saveAndFlush(usuario);
        usuarioId = usuario.getId();

        var rubricaInativa = new Rubrica(UUID.randomUUID(), "INATIVA", "Rubrica Inativa", false, false);
        rubricaRepository.saveAndFlush(rubricaInativa);
        rubricaInativaId = rubricaInativa.getId();
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void criarLicencaComRubricaInativa_DeveRetornar422() throws Exception {
        var request = new CriarLicencaRequest(usuarioId, rubricaInativaId, LocalDate.now(), null);
        mockMvc.perform(post("/api/v1/licencas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity());
    }
}
