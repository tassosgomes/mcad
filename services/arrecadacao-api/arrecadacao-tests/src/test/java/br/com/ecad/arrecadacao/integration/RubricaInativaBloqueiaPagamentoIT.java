package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.application.dto.InativarRubricaRequest;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
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
class RubricaInativaBloqueiaPagamentoIT {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired SpringDataRubricaRepository rubricaRepository;
    @Autowired SpringDataUsuarioMusicaRepository usuarioMusicaRepository;
    @Autowired JpaLicencaRepository licencaRepository;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private UUID licencaId;
    private UUID rubricaId;

    @BeforeEach
    void setUp() {
        var usuario = UsuarioMusica.criar("Empresa Pagamento", "Fantasia",
                Cnpj.criar("08673009000175"),
                Endereco.criar("12345678", "Rua Teste", "1", "", "Bairro", "Cidade", "SP"),
                Contato.criar("Resp", "11999999999", "resp@test.com"));
        usuarioMusicaRepository.saveAndFlush(usuario);

        var rubrica = new Rubrica(UUID.randomUUID(), "PAG", "Rubrica Pagamento", false);
        rubricaRepository.saveAndFlush(rubrica);
        rubricaId = rubrica.getId();

        var licenca = Licenca.criar(usuario.getId(), rubricaId, LocalDate.now(), null);
        licencaRepository.save(licenca);
        licencaId = licenca.getId();
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void registrarPagamentoComRubricaInativa_DeveRetornar422() throws Exception {
        // Inativar a rubrica
        var inativarRequest = new InativarRubricaRequest("Rubrica inativada para teste");
        mockMvc.perform(post("/api/v1/rubricas/{id}/inativar", rubricaId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inativarRequest)))
                .andExpect(status().isOk());

        // Tentar registrar pagamento para licenca da rubrica inativa
        var body = String.format("{\"licencaId\":\"%s\",\"quantidadeUdas\":\"1.0\"}", licencaId);
        mockMvc.perform(post("/api/v1/pagamentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity());
    }
}
