package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.application.specification.PagamentoSpecification;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import br.com.ecad.arrecadacao.domain.aggregates.PagamentoAgregado;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(
        classes = br.com.ecad.arrecadacao.api.ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@Transactional
@SuppressWarnings("null")
class PagamentoPersistenceIntegrationTest {

    @Autowired Flyway flyway;
    @Autowired JpaUdaValorRepository udaValorRepository;
    @Autowired JpaPagamentoRepository pagamentoRepository;
    @Autowired SpringDataLicencaRepository licencaSpringData;
    @Autowired SpringDataUsuarioMusicaRepository usuarioMusicaSpringData;
    @Autowired SpringDataRubricaRepository rubricaSpringData;
    @Autowired EntityManager entityManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    // ── helpers ────────────────────────────────────────────────────────────────

    private UsuarioMusica criarUsuario(String razaoSocial, String cnpj) {
        var u = UsuarioMusica.criar(razaoSocial, "Fantasia", Cnpj.criar(cnpj),
            Endereco.criar("12345678", "Rua Teste", "1", "", "Bairro", "Cidade", "SP"),
            Contato.criar("Resp", "11999999999", "resp@test.com"));
        return usuarioMusicaSpringData.saveAndFlush(u);
    }

    private Rubrica criarRubrica(String sigla) {
        var r = new Rubrica(UUID.randomUUID(), sigla, "Rubrica " + sigla, false);
        return rubricaSpringData.saveAndFlush(r);
    }

    private Licenca criarLicenca(UUID usuarioId, UUID rubricaId) {
        var l = Licenca.criar(usuarioId, rubricaId, LocalDate.now(), null);
        return licencaSpringData.saveAndFlush(l);
    }

    // ── tests ──────────────────────────────────────────────────────────────────

    @Test
    void deveExecutarTrezeMigrations() {
        var applied = flyway.info().applied();
        assertThat(applied).hasSize(13);
    }

    @Test
    void deveTerSeedUdaComValor107_31() {
        var uda = udaValorRepository.findVigente(LocalDate.of(2026, 4, 1));
        assertThat(uda).isPresent();
        assertThat(uda.get().getValor()).isEqualByComparingTo("107.310000");
    }

    @Test
    void devePersistirEBuscarUdaValor() {
        // Arrange
        var uda = UdaValor.criar(new BigDecimal("115.00"), LocalDate.of(2026, 7, 1), "analista");

        // Act
        udaValorRepository.save(uda);
        var encontrada = udaValorRepository.findVigente(LocalDate.of(2026, 8, 1));

        // Assert
        assertThat(encontrada).isPresent();
        assertThat(encontrada.get().getValor()).isEqualByComparingTo("115.00");
    }

    @Test
    void devePersistirEBuscarPagamento() {
        // Arrange
        var usuario = criarUsuario("Empresa Pag", "14487578000129");
        var rubrica = criarRubrica("RPG");
        var licenca = criarLicenca(usuario.getId(), rubrica.getId());

        var pagamento = Pagamento.registrar(licenca.getId(), new BigDecimal("2.5"), new BigDecimal("107.31"));

        // Act
        pagamentoRepository.save(pagamento);
        var encontrado = pagamentoRepository.findById(pagamento.getId());

        // Assert
        assertThat(encontrado).isPresent();
        assertThat(encontrado.get().getValorBruto()).isEqualByComparingTo("268.275000");
        assertThat(encontrado.get().getStatus()).isEqualTo(StatusPagamento.CONFIRMADO);
    }

    @Test
    void deveRejeitarSegundoPagamentoConfirmadoParaMesmaLicencaEPeriodo() {
        // Arrange
        var usuario = criarUsuario("Empresa Unique", "77257601000109");
        var rubrica = criarRubrica("RUQ");
        var licenca = criarLicenca(usuario.getId(), rubrica.getId());

        var pag1 = Pagamento.registrar(licenca.getId(), new BigDecimal("1.0"), new BigDecimal("107.31"));
        pagamentoRepository.save(pag1);
        entityManager.flush();

        var pag2 = Pagamento.registrar(licenca.getId(), new BigDecimal("2.0"), new BigDecimal("107.31"));
        pagamentoRepository.save(pag2);

        // Act & Assert — partial unique index (status=CONFIRMADO) deve rejeitar
        assertThrows(Exception.class, () -> entityManager.flush());
    }

    @Test
    void deveFiltrarPagamentosPorPeriodoviaSpecification() {
        // Arrange
        var usuario = criarUsuario("Empresa Filtro", "95917128000120");
        var rubrica = criarRubrica("RFC");
        var licenca = criarLicenca(usuario.getId(), rubrica.getId());

        var pagamento = Pagamento.registrar(licenca.getId(), new BigDecimal("1.5"), new BigDecimal("107.31"));
        pagamentoRepository.save(pagamento);
        entityManager.flush();

        // Act
        var spec = PagamentoSpecification.comFiltros(null, null, null, pagamento.getPeriodo(), null);
        var page = pagamentoRepository.findAll(spec, Pageable.unpaged());

        // Assert
        assertThat(page.getContent()).extracting("id").contains(pagamento.getId());
    }

    @Test
    void deveFiltrarPagamentosPorStatusViaSpecification() {
        // Arrange
        var usuario = criarUsuario("Empresa Status", "60914221000105");
        var rubrica = criarRubrica("RSS");
        var licenca = criarLicenca(usuario.getId(), rubrica.getId());

        var pag = Pagamento.registrar(licenca.getId(), new BigDecimal("1.0"), new BigDecimal("107.31"));
        pagamentoRepository.save(pag);
        entityManager.flush();

        // Act
        var spec = PagamentoSpecification.comFiltros(null, null, null, null, StatusPagamento.CONFIRMADO);
        var page = pagamentoRepository.findAll(spec, Pageable.unpaged());

        // Assert — deve conter o pagamento recém-criado
        assertThat(page.getContent()).extracting("id").contains(pag.getId());
    }

    // ── Testes F06 — Estorno ───────────────────────────────────────────────────

    @Test
    void devePersistirCamposDeEstorno() {
        // Arrange
        var usuario = criarUsuario("Empresa Estorno", "10433218000193");
        var rubrica = criarRubrica("REST");
        var licenca = criarLicenca(usuario.getId(), rubrica.getId());

        var pagamento = Pagamento.registrar(licenca.getId(), new BigDecimal("2.0"), new BigDecimal("107.31"));
        pagamentoRepository.save(pagamento);
        entityManager.flush();

        // Estornar
        String justificativa = "Pagamento registrado em duplicidade com valor incorreto.";
        String autor = "analista@ecad.org.br";
        pagamento.estornar(justificativa, autor);
        pagamentoRepository.save(pagamento);
        entityManager.flush();
        entityManager.clear();

        // Act — rebuscar do banco
        var encontrado = pagamentoRepository.findById(pagamento.getId());

        // Assert — campos de estorno persistidos
        assertThat(encontrado).isPresent();
        assertThat(encontrado.get().getStatus()).isEqualTo(StatusPagamento.ESTORNADO);
        assertThat(encontrado.get().getJustificativaEstorno()).isEqualTo(justificativa);
        assertThat(encontrado.get().getEstornadoPor()).isEqualTo(autor);
        assertThat(encontrado.get().getEstornadoEm()).isNotNull();
    }

    @Test
    void devePermitirNovoPagamentoAposEstorno() {
        // Arrange — partial unique: após estorno, slot libera
        var usuario = criarUsuario("Empresa Reuso", "19600133000127");
        var rubrica = criarRubrica("RRE");
        var licenca = criarLicenca(usuario.getId(), rubrica.getId());

        // Primeiro pagamento CONFIRMADO
        var pag1 = Pagamento.registrar(licenca.getId(), new BigDecimal("1.0"), new BigDecimal("107.31"));
        pagamentoRepository.save(pag1);
        entityManager.flush();

        // Estornar o primeiro
        pag1.estornar("Estorno de teste para liberar slot.", "analista@ecad.org.br");
        pagamentoRepository.save(pag1);
        entityManager.flush();

        // Act — novo pagamento CONFIRMADO para mesma licença+período (slot liberado)
        var pag2 = Pagamento.registrar(licenca.getId(), new BigDecimal("2.0"), new BigDecimal("107.31"));
        pagamentoRepository.save(pag2);

        // Assert — não deve lançar exceção de unicidade
        assertThat(pagamentoRepository.findById(pag2.getId())).isPresent();
    }

    // ── Testes F05 — sumAndCountConfirmados ────────────────────────────────────

    @Test
    void deveSomarApenasConfirmadosIgnorandoEstornados() {
        // Arrange — seed: usuário A com rubrica X, 3 pagamentos CONFIRMADOS + 1 ESTORNADO
        // para mesma rubrica+período, mais 1 pagamento CONFIRMADO em outra rubrica (Y)
        var periodo = "2026-05";

        var usuario = criarUsuario("Empresa Soma", "84190440000170");
        var rubricaX = criarRubrica("RX5");
        var rubricaY = criarRubrica("RY5");

        // Licença para rubricaX (3 pagamentos confirmados entram na soma)
        // Usamos 3 usuários/licenças distintos para contornar a constraint unique (licenca+periodo+CONFIRMADO)
        var usuarioA1 = criarUsuario("Empresa Soma A1", "52597530000195");
        var usuarioA2 = criarUsuario("Empresa Soma A2", "65396215000190");
        var usuarioA3 = criarUsuario("Empresa Soma A3", "34960727000190");
        var usuarioA4 = criarUsuario("Empresa Soma A4", "59244547000140");

        var licA1 = criarLicenca(usuarioA1.getId(), rubricaX.getId());
        var licA2 = criarLicenca(usuarioA2.getId(), rubricaX.getId());
        var licA3 = criarLicenca(usuarioA3.getId(), rubricaX.getId());
        var licA4 = criarLicenca(usuarioA4.getId(), rubricaX.getId());

        // 3 pagamentos CONFIRMADOS para rubricaX — valores 5, 3, 2 UDAs × R$10
        var pag1 = criarPagamentoComPeriodo(licA1.getId(), new BigDecimal("5.0"), new BigDecimal("10.00"), periodo);
        var pag2 = criarPagamentoComPeriodo(licA2.getId(), new BigDecimal("3.0"), new BigDecimal("10.00"), periodo);
        var pag3 = criarPagamentoComPeriodo(licA3.getId(), new BigDecimal("2.0"), new BigDecimal("10.00"), periodo);

        // 1 pagamento ESTORNADO para rubricaX — não deve entrar na soma
        var pag4 = criarPagamentoComPeriodo(licA4.getId(), new BigDecimal("1.0"), new BigDecimal("10.00"), periodo);
        pag4.estornar("Estorno para teste de agregado.", "analista@ecad.org.br");
        pagamentoRepository.save(pag4);

        // 1 pagamento CONFIRMADO para rubricaY — não deve entrar na soma de rubricaX
        var usuarioB = criarUsuario("Empresa Soma B", "92834699000190");
        var licB = criarLicenca(usuarioB.getId(), rubricaY.getId());
        criarPagamentoComPeriodo(licB.getId(), new BigDecimal("99.0"), new BigDecimal("10.00"), periodo);

        entityManager.flush();
        entityManager.clear();

        // Act
        PagamentoAgregado agregado = pagamentoRepository.sumAndCountConfirmados(rubricaX.getId(), periodo);

        // Assert — totalBruto = (5 + 3 + 2) × 10 = 100; quantidade = 3
        assertThat(agregado).isNotNull();
        assertThat(agregado.totalBruto()).isEqualByComparingTo(new BigDecimal("100.000000"));
        assertThat(agregado.quantidade()).isEqualTo(3L);
    }

    @Test
    void deveRetornarZeroQuandoNaoHaPagamentosConfirmados() {
        // Arrange — rubrica sem nenhum pagamento
        var rubricaSemPagamentos = criarRubrica("RZR");
        entityManager.flush();
        entityManager.clear();

        // Act
        PagamentoAgregado agregado = pagamentoRepository.sumAndCountConfirmados(
                rubricaSemPagamentos.getId(), "2026-05");

        // Assert — COALESCE garante totalBruto = 0 e quantidade = 0 (não null)
        assertThat(agregado).isNotNull();
        assertThat(agregado.totalBruto()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(agregado.quantidade()).isEqualTo(0L);
    }

    // helper para criar pagamento com período explícito (via reflexão para contornar YearMonth.now())
    private Pagamento criarPagamentoComPeriodo(UUID licencaId, BigDecimal udas, BigDecimal valorUda, String periodo) {
        var pag = Pagamento.registrar(licencaId, udas, valorUda);
        // Substitui o período via reflection para permitir período fixo nos testes
        try {
            var field = Pagamento.class.getDeclaredField("periodo");
            field.setAccessible(true);
            field.set(pag, periodo);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            throw new RuntimeException("Falha ao definir periodo via reflexao no teste", e);
        }
        return pagamentoRepository.save(pag);
    }
}
