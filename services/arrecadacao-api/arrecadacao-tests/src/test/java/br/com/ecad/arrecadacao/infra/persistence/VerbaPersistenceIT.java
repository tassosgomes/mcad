package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoFiltro;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoProjection;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Testes de integração para JpaVerbaRepository (task 2.0 — F05).
 *
 * <p>Conecta ao PostgreSQL real via docker-compose.dev.yml.
 * Cobre: insert+findById, unique constraint (rubrica_id, periodo),
 * lock pessimista FOR UPDATE serializa threads concorrentes, e
 * findAgregadoPorRubrica retorna SUM correto.</p>
 *
 * <p>Os testes de lock NOT anotados com @Transactional gerenciam transações
 * manualmente via TransactionTemplate para permitir commits reais (necessários
 * para que o lock seja liberado entre threads).</p>
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@Transactional
@SuppressWarnings("null")
class VerbaPersistenceIT {

    @Autowired
    private VerbaRepository verbaRepository;

    @Autowired
    private SpringDataRubricaRepository rubricaSpringData;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PlatformTransactionManager txManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private Rubrica rubrica;

    @BeforeEach
    void setUp() {
        rubrica = rubricaSpringData.save(
                new Rubrica(UUID.randomUUID(), "VT_TEST_" + UUID.randomUUID().toString().substring(0, 4),
                        "Rubrica de Teste VerbaPersistenceIT", false));
    }

    // ── insert + findById ──────────────────────────────────────────────────────

    @Test
    void save_NewVerba_ShouldPersistAndFindById() {
        // Arrange
        Verba verba = Verba.abrir(rubrica.getId(), "2026-04");

        // Act
        Verba salva = verbaRepository.save(verba);
        entityManager.flush();
        entityManager.clear();

        // Assert — busca sem lock
        var encontrada = verbaRepository.findByRubricaIdAndPeriodo(rubrica.getId(), "2026-04");
        assertThat(encontrada).isPresent();
        assertThat(encontrada.get().getId()).isEqualTo(salva.getId());
        assertThat(encontrada.get().getRubricaId()).isEqualTo(rubrica.getId());
        assertThat(encontrada.get().getPeriodo()).isEqualTo("2026-04");
        assertThat(encontrada.get().getValorBrutoTotal()).isEqualByComparingTo("0.00");
        assertThat(encontrada.get().getVerbaLiquida()).isEqualByComparingTo("0.00");
    }

    @Test
    void save_WithRecalculo_ShouldPersistValoresCalculados() {
        // Arrange
        Verba verba = Verba.abrir(rubrica.getId(), "2026-05");
        verbaRepository.save(verba);
        entityManager.flush();

        // Act — recalcular com valor bruto conhecido
        verba.recalcular(new BigDecimal("1073.10"), 10);
        verbaRepository.save(verba);
        entityManager.flush();
        entityManager.clear();

        // Assert
        var encontrada = verbaRepository.findByRubricaIdAndPeriodo(rubrica.getId(), "2026-05");
        assertThat(encontrada).isPresent();
        assertThat(encontrada.get().getValorBrutoTotal()).isEqualByComparingTo("1073.10");
        assertThat(encontrada.get().getDeducaoEcad()).isEqualByComparingTo("107.31");
        assertThat(encontrada.get().getDeducaoAssociacoes()).isEqualByComparingTo("53.66");
        assertThat(encontrada.get().getVerbaLiquida()).isEqualByComparingTo("912.13");
        assertThat(encontrada.get().getQuantidadePagamentos()).isEqualTo(10);
    }

    // ── unique constraint (rubrica_id, periodo) ────────────────────────────────

    @Test
    void save_DuplicateRubricaAndPeriodo_ShouldThrowConstraintViolation() {
        // Arrange — primeira verba salva
        Verba v1 = Verba.abrir(rubrica.getId(), "2026-06");
        verbaRepository.save(v1);
        entityManager.flush();

        // Act — segunda verba com mesma chave
        Verba v2 = Verba.abrir(rubrica.getId(), "2026-06");
        verbaRepository.save(v2);

        // Assert — flush deve lançar constraint violation
        assertThrows(Exception.class, () -> entityManager.flush());
    }

    // ── lock pessimista FOR UPDATE serializa duas threads ─────────────────────

    /**
     * Verifica que findByRubricaIdAndPeriodoForUpdate serializa transações concorrentes.
     *
     * Cenário:
     * 1. Thread A adquire o lock (FOR UPDATE), atualiza bruto para 500.00 e aguarda sinal.
     * 2. Thread B tenta adquirir o lock — fica bloqueada.
     * 3. Thread A commita (libera lock).
     * 4. Thread B prossegue, lê o valor já escrito por A (500.00), atualiza para 750.00.
     * 5. Assert: valor final é 750.00 — não houve lost update.
     *
     * <p>Este teste usa transações independentes (sem @Transactional no método)
     * para garantir commits reais entre threads.</p>
     */
    @Test
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void findByRubricaIdAndPeriodoForUpdate_ConcurrentThreads_ShouldSerialize() throws Exception {
        TransactionTemplate tt = new TransactionTemplate(txManager);

        // --- Setup: criar verba inicial em transação separada ---
        UUID rubricaIdParaLock = tt.execute(status -> {
            Rubrica r = rubricaSpringData.save(new Rubrica(
                    UUID.randomUUID(),
                    "VT_LOCK_" + UUID.randomUUID().toString().substring(0, 4),
                    "Rubrica Lock Test",
                    false));
            Verba v = Verba.abrir(r.getId(), "2026-07");
            verbaRepository.save(v);
            return r.getId();
        });

        assertThat(rubricaIdParaLock).isNotNull();

        CountDownLatch threadAHoldingLock = new CountDownLatch(1);
        CountDownLatch threadBAttemptedLock = new CountDownLatch(1);
        AtomicReference<String> valorDepoisDeA = new AtomicReference<>();
        AtomicReference<String> valorDepoisDeB = new AtomicReference<>();
        AtomicReference<Throwable> threadAError = new AtomicReference<>();
        AtomicReference<Throwable> threadBError = new AtomicReference<>();

        // Thread A: adquire lock, escreve 500.00, aguarda sinal, commita
        CompletableFuture<Void> threadA = CompletableFuture.runAsync(() -> {
            try {
                tt.execute(status -> {
                    var verba = verbaRepository.findByRubricaIdAndPeriodoForUpdate(rubricaIdParaLock, "2026-07")
                            .orElseThrow(() -> new RuntimeException("Verba nao encontrada em A"));
                    verba.recalcular(new BigDecimal("500.00"), 5);
                    verbaRepository.save(verba);
                    valorDepoisDeA.set(verba.getVerbaLiquida().toPlainString());

                    // Sinaliza que A tem o lock
                    threadAHoldingLock.countDown();

                    // Aguarda B tentar adquirir o lock (B está bloqueada)
                    try {
                        threadBAttemptedLock.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }

                    return null; // commita ao sair do lambda
                });
            } catch (Throwable t) {
                threadAError.set(t);
                threadAHoldingLock.countDown(); // desbloquear B em caso de erro
            }
        });

        // Aguarda A ter adquirido o lock
        assertThat(threadAHoldingLock.await(10, TimeUnit.SECONDS))
                .as("Thread A deveria ter adquirido o lock")
                .isTrue();

        // Thread B: tenta lock (será bloqueada até A commitar), escreve 750.00
        CompletableFuture<Void> threadB = CompletableFuture.runAsync(() -> {
            try {
                tt.execute(status -> {
                    // Sinaliza que B está tentando adquirir (para A saber que pode commitar)
                    threadBAttemptedLock.countDown();

                    // Esta linha bloqueia até A commitar o lock
                    var verba = verbaRepository.findByRubricaIdAndPeriodoForUpdate(rubricaIdParaLock, "2026-07")
                            .orElseThrow(() -> new RuntimeException("Verba nao encontrada em B"));
                    verba.recalcular(new BigDecimal("750.00"), 7);
                    verbaRepository.save(verba);
                    valorDepoisDeB.set(verba.getVerbaLiquida().toPlainString());
                    return null;
                });
            } catch (Throwable t) {
                threadBError.set(t);
            }
        });

        // Aguarda ambas as threads concluírem
        CompletableFuture.allOf(threadA, threadB).get(30, TimeUnit.SECONDS);

        // Assert — sem erros nas threads
        assertThat(threadAError.get())
                .as("Thread A nao deve ter lancado excecao: " + threadAError.get())
                .isNull();
        assertThat(threadBError.get())
                .as("Thread B nao deve ter lancado excecao: " + threadBError.get())
                .isNull();

        // Assert — o valor final (escrito por B após A) é 750 * 85% = 637.50
        tt.execute(status -> {
            var verba = verbaRepository.findByRubricaIdAndPeriodo(rubricaIdParaLock, "2026-07");
            assertThat(verba).isPresent();
            assertThat(verba.get().getValorBrutoTotal()).isEqualByComparingTo("750.00");
            assertThat(verba.get().getVerbaLiquida()).isEqualByComparingTo("637.50");
            // Limpar dados do teste (transação será rollback pois lançamos status.setRollbackOnly)
            status.setRollbackOnly();
            return null;
        });

        // Limpar dados criados sem transação: deletar a rubrica de lock
        tt.execute(status -> {
            entityManager.createQuery("DELETE FROM Verba v WHERE v.rubricaId = :rid")
                    .setParameter("rid", rubricaIdParaLock)
                    .executeUpdate();
            entityManager.createQuery("DELETE FROM Rubrica r WHERE r.id = :rid")
                    .setParameter("rid", rubricaIdParaLock)
                    .executeUpdate();
            return null;
        });
    }

    // ── findAgregadoPorRubrica ────────────────────────────────────────────────

    @Test
    void findAgregadoPorRubrica_WithMultiplePeriodos_ShouldSumCorrectly() {
        // Arrange — salvar 3 verbas (2 períodos para a rubrica do setUp + 1 para outra)
        Rubrica outraRubrica = rubricaSpringData.save(
                new Rubrica(UUID.randomUUID(), "VT_OUT_" + UUID.randomUUID().toString().substring(0, 4),
                        "Outra Rubrica", false));

        // Verba 1 — rubrica principal, período 2026-01 — bruto: 1000.00
        Verba v1 = Verba.abrir(rubrica.getId(), "2026-01");
        v1.recalcular(new BigDecimal("1000.00"), 5);
        verbaRepository.save(v1);

        // Verba 2 — rubrica principal, período 2026-02 — bruto: 500.00
        Verba v2 = Verba.abrir(rubrica.getId(), "2026-02");
        v2.recalcular(new BigDecimal("500.00"), 3);
        verbaRepository.save(v2);

        // Verba 3 — outra rubrica, período 2026-01 — bruto: 2000.00
        Verba v3 = Verba.abrir(outraRubrica.getId(), "2026-01");
        v3.recalcular(new BigDecimal("2000.00"), 10);
        verbaRepository.save(v3);

        entityManager.flush();
        entityManager.clear();

        // Act — sem filtros
        var filtroSemFiltros = new VerbaAgregadoFiltro(null, null, null);
        List<VerbaAgregadoProjection> resultado = verbaRepository.findAgregadoPorRubrica(filtroSemFiltros);

        // Assert — deve conter ao menos as duas rubricas do teste
        assertThat(resultado).isNotEmpty();

        var agregadoPrincipal = resultado.stream()
                .filter(p -> p.getRubricaId().equals(rubrica.getId()))
                .findFirst();
        assertThat(agregadoPrincipal).isPresent();
        assertThat(agregadoPrincipal.get().getTotalBruto()).isEqualByComparingTo("1500.00");
        // liquida = 1500 * 0.85 = 1275.00 — calculada por subtração, pode ter diferença de arredondamento
        // v1: 1000 - 100 - 50 = 850; v2: 500 - 50 - 25 = 425 → soma = 1275.00
        assertThat(agregadoPrincipal.get().getTotalLiquida()).isEqualByComparingTo("1275.00");
        assertThat(agregadoPrincipal.get().getQuantidadePeriodos()).isEqualTo(2L);
        assertThat(agregadoPrincipal.get().getRubricaSigla()).isEqualTo(rubrica.getSigla());
        assertThat(agregadoPrincipal.get().getRubricaNome()).isEqualTo(rubrica.getNome());
    }

    @Test
    void findAgregadoPorRubrica_FilterByRubricaSigla_ShouldReturnOnlyMatchingRubrica() {
        // Arrange
        Verba v1 = Verba.abrir(rubrica.getId(), "2026-03");
        v1.recalcular(new BigDecimal("300.00"), 2);
        verbaRepository.save(v1);
        entityManager.flush();
        entityManager.clear();

        // Act — filtrar pela sigla da rubrica do setUp
        var filtro = new VerbaAgregadoFiltro(rubrica.getSigla(), null, null);
        List<VerbaAgregadoProjection> resultado = verbaRepository.findAgregadoPorRubrica(filtro);

        // Assert
        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).getRubricaId()).isEqualTo(rubrica.getId());
        assertThat(resultado.get(0).getTotalBruto()).isEqualByComparingTo("300.00");
    }

    @Test
    void findAgregadoPorRubrica_FilterByPeriodoRange_ShouldRespectRange() {
        // Arrange
        Verba v1 = Verba.abrir(rubrica.getId(), "2025-10");
        v1.recalcular(new BigDecimal("100.00"), 1);
        verbaRepository.save(v1);

        Verba v2 = Verba.abrir(rubrica.getId(), "2025-11");
        v2.recalcular(new BigDecimal("200.00"), 2);
        verbaRepository.save(v2);

        Verba v3 = Verba.abrir(rubrica.getId(), "2025-12");
        v3.recalcular(new BigDecimal("300.00"), 3);
        verbaRepository.save(v3);

        entityManager.flush();
        entityManager.clear();

        // Act — filtrar apenas 2025-11 e 2025-12
        var filtro = new VerbaAgregadoFiltro(null, "2025-11", "2025-12");
        List<VerbaAgregadoProjection> resultado = verbaRepository.findAgregadoPorRubrica(filtro);

        var agregado = resultado.stream()
                .filter(p -> p.getRubricaId().equals(rubrica.getId()))
                .findFirst();
        assertThat(agregado).isPresent();
        assertThat(agregado.get().getTotalBruto()).isEqualByComparingTo("500.00");
        assertThat(agregado.get().getQuantidadePeriodos()).isEqualTo(2L);
    }
}
