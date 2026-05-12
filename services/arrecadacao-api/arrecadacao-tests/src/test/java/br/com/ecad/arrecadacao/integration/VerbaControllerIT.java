package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.hamcrest.Matchers.equalTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * IT dos endpoints de VerbaController (HU-03, HU-04, HU-05, task 9.5).
 *
 * <p>Usa MockMvc + perfil de teste com PostgreSQL real (docker-compose.dev.yml).
 * Importa {@link VerbaServiceTestConfig} pois os endpoints de verbas são
 * read-only — o recálculo não é exercitado aqui (apenas consulta).</p>
 *
 * <p>Cenários cobertos:
 * <ul>
 *   <li>GET /api/v1/verbas — sem filtros retorna todos os itens</li>
 *   <li>GET /api/v1/verbas?rubricaSigla=... — filtro por rubrica</li>
 *   <li>GET /api/v1/verbas?status=EM_DISTRIBUICAO — filtro por status</li>
 *   <li>GET /api/v1/verbas?periodo=2026-13 — 400 período inválido</li>
 *   <li>GET /api/v1/verbas/agregado-por-rubrica — SUM correto</li>
 *   <li>GET /api/v1/verbas/{sigla}/{periodo} — 200 quando existe</li>
 *   <li>GET /api/v1/verbas/{sigla}/2099-01 — 404 quando não existe</li>
 * </ul>
 * </p>
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@AutoConfigureMockMvc
@Transactional
@SuppressWarnings("null")
class VerbaControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private VerbaRepository verbaRepository;

    @Autowired
    private SpringDataRubricaRepository rubricaRepository;

    @Autowired
    private EntityManager entityManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private String siglaRubrica1;
    private String siglaRubrica2;
    private UUID rubricaId1;
    private UUID rubricaId2;

    @BeforeEach
    void setUp() {
        // Criar 2 rubricas distintas com siglas únicas
        siglaRubrica1 = "VCI1_" + UUID.randomUUID().toString().substring(0, 3);
        siglaRubrica2 = "VCI2_" + UUID.randomUUID().toString().substring(0, 3);

        var rubrica1 = new Rubrica(UUID.randomUUID(), siglaRubrica1, "Rubrica Controller IT 1", false);
        var rubrica2 = new Rubrica(UUID.randomUUID(), siglaRubrica2, "Rubrica Controller IT 2", false);

        rubricaRepository.saveAndFlush(rubrica1);
        rubricaRepository.saveAndFlush(rubrica2);

        rubricaId1 = rubrica1.getId();
        rubricaId2 = rubrica2.getId();

        // Criar 3 verbas variando período e status
        // Verba 1 — rubrica1, 2026-01, ABERTA, bruto 1000
        Verba v1 = Verba.abrir(rubricaId1, "2026-01");
        v1.recalcular(new BigDecimal("1000.00"), 5);
        verbaRepository.save(v1);

        // Verba 2 — rubrica1, 2026-02, EM_DISTRIBUICAO, bruto 2000
        Verba v2 = Verba.abrir(rubricaId1, "2026-02");
        v2.recalcular(new BigDecimal("2000.00"), 10);
        v2.marcarEmDistribuicao();
        verbaRepository.save(v2);

        // Verba 3 — rubrica2, 2026-01, ABERTA, bruto 500
        Verba v3 = Verba.abrir(rubricaId2, "2026-01");
        v3.recalcular(new BigDecimal("500.00"), 2);
        verbaRepository.save(v3);

        entityManager.flush();
        entityManager.clear();
    }

    // ── GET /api/v1/verbas — sem filtros ──────────────────────────────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void listar_SemFiltros_DeveRetornarTodasAsVerbas() throws Exception {
        mockMvc.perform(get("/api/v1/verbas")
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.metadata.totalItems").isNumber());
    }

    // ── GET /api/v1/verbas?rubricaSigla=... — filtro por rubrica ─────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void listar_FiltradoPorRubricaSigla_DeveRetornarApenasVerbasDaRubrica() throws Exception {
        mockMvc.perform(get("/api/v1/verbas")
                        .param("rubricaSigla", siglaRubrica2)
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].rubrica.sigla").value(siglaRubrica2));
    }

    // ── GET /api/v1/verbas?status=EM_DISTRIBUICAO — filtro por status ─────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void listar_FiltradoPorStatusEmDistribuicao_DeveRetornarApenasVerbasBloqueadas() throws Exception {
        mockMvc.perform(get("/api/v1/verbas")
                        .param("status", "EM_DISTRIBUICAO")
                        .param("rubricaSigla", siglaRubrica1)
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].status").value("EM_DISTRIBUICAO"))
                .andExpect(jsonPath("$.items[0].periodo").value("2026-02"));
    }

    // ── GET /api/v1/verbas?periodo=2026-13 — período inválido → 400 ──────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void listar_PeriodoInvalido_DeveRetornar400() throws Exception {
        mockMvc.perform(get("/api/v1/verbas")
                        .param("periodo", "2026-13"))
                .andExpect(status().isBadRequest());
    }

    // ── GET /api/v1/verbas?periodoInicio=2026-99 — período início inválido ────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void listar_PeriodoInicioInvalido_DeveRetornar400() throws Exception {
        mockMvc.perform(get("/api/v1/verbas")
                        .param("periodoInicio", "INVALIDO"))
                .andExpect(status().isBadRequest());
    }

    // ── GET /api/v1/verbas/agregado-por-rubrica ───────────────────────────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void listarAgregado_DeveRetornarSumCorreto() throws Exception {
        // rubrica1 tem: bruto 1000 (2026-01) + 2000 (2026-02) = 3000 total
        // liquida: 850 + 1700 = 2550
        mockMvc.perform(get("/api/v1/verbas/agregado-por-rubrica"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // Verificar especificamente rubrica1
        mockMvc.perform(get("/api/v1/verbas/agregado-por-rubrica"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.rubrica.sigla == '" + siglaRubrica1 + "')].totalBruto")
                        .value(equalTo("3000.00")))
                .andExpect(jsonPath("$[?(@.rubrica.sigla == '" + siglaRubrica1 + "')].totalLiquida")
                        .value(equalTo("2550.00")))
                .andExpect(jsonPath("$[?(@.rubrica.sigla == '" + siglaRubrica1 + "')].quantidadePeriodos")
                        .value(equalTo(2)));
    }

    // ── GET /api/v1/verbas/{rubricaSigla}/{periodo} — busca pontual 200 ───────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void buscar_VerbaExistente_DeveRetornar200ComPayloadCompleto() throws Exception {
        mockMvc.perform(get("/api/v1/verbas/{rubricaSigla}/{periodo}", siglaRubrica1, "2026-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rubrica.sigla").value(siglaRubrica1))
                .andExpect(jsonPath("$.periodo").value("2026-01"))
                .andExpect(jsonPath("$.valorBrutoTotal").value("1000.00"))
                .andExpect(jsonPath("$.deducaoEcad").value("100.00"))
                .andExpect(jsonPath("$.deducaoAssociacoes").value("50.00"))
                .andExpect(jsonPath("$.verbaLiquida").value("850.00"))
                .andExpect(jsonPath("$.quantidadePagamentos").value(5))
                .andExpect(jsonPath("$.status").value("ABERTA"));
    }

    // ── GET /api/v1/verbas/{rubricaSigla}/2099-01 — não existe → 404 ─────────────

    @Test
    @WithMockUser(roles = "analista-arrecadacao")
    void buscar_VerbaInexistente_DeveRetornar404() throws Exception {
        mockMvc.perform(get("/api/v1/verbas/{rubricaSigla}/{periodo}", siglaRubrica1, "2099-01"))
                .andExpect(status().isNotFound());
    }

    // ── Acesso por consultor — deve funcionar (read-only) ────────────────────────

    @Test
    @WithMockUser(roles = "consultor-arrecadacao")
    void listar_ConsultorArrecadacao_DeveRetornar200() throws Exception {
        mockMvc.perform(get("/api/v1/verbas")
                        .param("size", "5"))
                .andExpect(status().isOk());
    }

    // ── Sem role — deve retornar 403 ─────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "outro-role")
    void listar_SemRole_DeveRetornar403() throws Exception {
        mockMvc.perform(get("/api/v1/verbas"))
                .andExpect(status().isForbidden());
    }
}
