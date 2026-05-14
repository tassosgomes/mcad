package br.com.ecad.arrecadacao.api;

import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
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
        classes = br.com.ecad.arrecadacao.api.ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@AutoConfigureMockMvc
@Transactional
@SuppressWarnings("null")
class UdaEndpointsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Test
    @WithMockUser
    void deveRetornarUdaVigenteSeed() throws Exception {
        // Seed V7: R$ 107,31 com dataVigencia 2026-01-01
        mockMvc.perform(get("/api/v1/uda/vigente"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valor").value("107.310000"))
            .andExpect(jsonPath("$.dataVigencia").value("2026-01-01"));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveCriarNovoValorUdaERetornar201() throws Exception {
        var body = "{\"valor\":\"110.50\",\"dataVigencia\":\"2026-07-01\"}";
        mockMvc.perform(post("/api/v1/uda")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.valor").isNotEmpty())
            .andExpect(jsonPath("$.dataVigencia").value("2026-07-01"));
    }

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void deveRetornar400ParaValorZeroNaUda() throws Exception {
        var body = "{\"valor\":\"0\",\"dataVigencia\":\"2026-07-01\"}";
        mockMvc.perform(post("/api/v1/uda")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void deveRetornar403ParaConsultorAoAjustarUda() throws Exception {
        var body = "{\"valor\":\"110.50\",\"dataVigencia\":\"2026-07-01\"}";
        mockMvc.perform(post("/api/v1/uda")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void deveRetornar422QuandoNaoHaUdaVigente() throws Exception {
        // Remove o seed vigente (V7 insere 2026-01-01) dentro da transacao do teste;
        // o rollback restaura o seed apos o teste. Sem nenhum UdaValor com
        // dataVigencia <= hoje, GET /api/v1/uda/vigente deve disparar
        // UdaVigenteNaoEncontradaException -> 422.
        jdbcTemplate.update("DELETE FROM arrecadacao.uda_valor WHERE data_vigencia <= CURRENT_DATE");

        mockMvc.perform(get("/api/v1/uda/vigente"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.title").value("UDA Value Not Found"));
    }

}
