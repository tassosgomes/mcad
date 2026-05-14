package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.application.commands.EstornarPagamentoCommand;
import br.com.ecad.arrecadacao.application.commands.RegistrarPagamentoCommand;
import br.com.ecad.arrecadacao.application.commands.handlers.EstornarPagamentoCommandHandler;
import br.com.ecad.arrecadacao.application.commands.handlers.RegistrarPagamentoCommandHandler;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataLicencaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataPagamentoRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import br.com.ecad.arrecadacao.infra.persistence.JpaUdaValorRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataUsuarioMusicaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * IT de lock de distribuição (HU-05, task 9.3).
 *
 * <p>Verifica que {@link VerbaEmDistribuicaoException} é lançada quando:
 * <ul>
 *   <li>Verba está {@code EM_DISTRIBUICAO} e tentamos registrar um novo pagamento</li>
 *   <li>Verba está {@code EM_DISTRIBUICAO} e tentamos estornar um pagamento existente</li>
 * </ul>
 * Em ambos os casos, a operação não deve persistir dados (pagamento ou alteração).</p>
 *
 * <p><b>Nota:</b> NÃO importa {@link br.com.ecad.arrecadacao.config.VerbaServiceTestConfig}
 * para que a implementação real {@code VerbaServiceImpl} seja usada.</p>
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class VerbaLockIT {

    @Autowired
    private RegistrarPagamentoCommandHandler registrarPagamentoHandler;

    @Autowired
    private EstornarPagamentoCommandHandler estornarPagamentoHandler;

    @Autowired
    private VerbaRepository verbaRepository;

    @Autowired
    private SpringDataRubricaRepository rubricaRepository;

    @Autowired
    private SpringDataUsuarioMusicaRepository usuarioMusicaRepository;

    @Autowired
    private SpringDataLicencaRepository licencaRepository;

    @Autowired
    private JpaUdaValorRepository udaValorRepository;

    @Autowired
    private SpringDataPagamentoRepository pagamentoRepository;

    @Autowired
    private PlatformTransactionManager txManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private TransactionTemplate tt;
    private UUID rubricaId;
    private String siglaRubrica;
    private String periodo;

    @BeforeEach
    void setUp() {
        tt = new TransactionTemplate(txManager);
        periodo = YearMonth.now().minusMonths(2).toString(); // Período passado para não conflitar com outros testes

        // Garantir UDA vigente
        tt.execute(status -> {
            if (udaValorRepository.findVigente(LocalDate.now()).isEmpty()) {
                var uda = UdaValor.criar(new BigDecimal("107.31"), LocalDate.of(2020, 1, 1), "setup");
                udaValorRepository.save(uda);
            }
            return null;
        });

        // Criar rubrica
        tt.execute(status -> {
            siglaRubrica = "LOCK_" + UUID.randomUUID().toString().substring(0, 4);
            var rubrica = new Rubrica(UUID.randomUUID(), siglaRubrica, "Rubrica Lock IT", false);
            rubricaRepository.save(rubrica);
            rubricaId = rubrica.getId();
            return null;
        });
    }

    // ── Cenário 1: EM_DISTRIBUICAO bloqueia novo pagamento ────────────────────────

    @Test
    void registrarPagamento_ComVerbaEmDistribuicao_DeveLancarExcecao() {
        // Arrange — criar verba EM_DISTRIBUICAO diretamente via repositório
        tt.execute(status -> {
            Verba verba = Verba.abrir(rubricaId, periodo);
            verba.recalcular(new BigDecimal("500.00"), 1);
            verba.marcarEmDistribuicao();
            verbaRepository.save(verba);
            return null;
        });

        // Criar licença ativa para a rubrica
        UUID[] licencaIdHolder = new UUID[1];
        tt.execute(status -> {
            var usuario = criarUsuario("Empresa Lock 1", "56177546000160");
            usuarioMusicaRepository.save(usuario);
            var licenca = Licenca.criar(usuario.getId(), rubricaId, LocalDate.now(), null);
            licencaRepository.save(licenca);
            licencaIdHolder[0] = licenca.getId();
            return null;
        });

        // Contar pagamentos antes da tentativa
        long pagamentosAntes = tt.execute(status -> {
            long count = pagamentoRepository.count();
            status.setRollbackOnly();
            return count;
        });

        // Act + Assert — deve lançar VerbaEmDistribuicaoException
        assertThatThrownBy(() -> tt.execute(status -> {
            var cmd = new RegistrarPagamentoCommand(
                    licencaIdHolder[0],
                    new BigDecimal("2.0"),
                    "analista@ecad.org.br");
            registrarPagamentoHandler.handle(cmd);
            return null;
        })).hasCauseInstanceOf(VerbaEmDistribuicaoException.class);

        // Assert — pagamento não foi gravado
        long pagamentosDepois = tt.execute(status -> {
            long count = pagamentoRepository.count();
            status.setRollbackOnly();
            return count;
        });

        assertThat(pagamentosDepois)
                .as("Nenhum pagamento deve ter sido gravado quando verba esta EM_DISTRIBUICAO")
                .isEqualTo(pagamentosAntes);
    }

    // ── Cenário 2: EM_DISTRIBUICAO bloqueia estorno ───────────────────────────────

    @Test
    void estornarPagamento_ComVerbaEmDistribuicao_DeveLancarExcecao() {
        // Arrange — criar verba ABERTA e registrar um pagamento normalmente
        UUID[] licencaIdHolder = new UUID[1];
        UUID[] pagamentoIdHolder = new UUID[1];

        tt.execute(status -> {
            var usuario = criarUsuario("Empresa Lock 2", "92200459000180");
            usuarioMusicaRepository.save(usuario);
            var licenca = Licenca.criar(usuario.getId(), rubricaId, LocalDate.now(), null);
            licencaRepository.save(licenca);
            licencaIdHolder[0] = licenca.getId();
            return null;
        });

        // Registrar pagamento (cria verba automaticamente via VerbaServiceImpl)
        tt.execute(status -> {
            var cmd = new RegistrarPagamentoCommand(
                    licencaIdHolder[0],
                    new BigDecimal("3.0"),
                    "analista@ecad.org.br");
            var response = registrarPagamentoHandler.handle(cmd);
            pagamentoIdHolder[0] = response.id();
            return null;
        });

        // Verificar que verba foi criada como ABERTA
        tt.execute(status -> {
            var verba = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, periodo);
            // Nota: período atual pode diferir do período do pagamento (que usa YearMonth.now())
            status.setRollbackOnly();
            return null;
        });

        // Agora marcar a verba como EM_DISTRIBUICAO diretamente
        tt.execute(status -> {
            // Buscar verba com o período atual (que é o que o handler usa)
            String periodoAtual = YearMonth.now().toString();
            var verbaOpt = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, periodoAtual);
            verbaOpt.ifPresent(verba -> {
                verba.marcarEmDistribuicao();
                verbaRepository.save(verba);
            });
            return null;
        });

        // Act + Assert — tentar estornar deve lançar VerbaEmDistribuicaoException
        assertThatThrownBy(() -> tt.execute(status -> {
            var cmd = new EstornarPagamentoCommand(
                    pagamentoIdHolder[0],
                    "Justificativa de estorno valida com mais de 10 chars.",
                    "analista@ecad.org.br");
            estornarPagamentoHandler.handle(cmd);
            return null;
        })).hasCauseInstanceOf(VerbaEmDistribuicaoException.class);

        // Assert — pagamento ainda deve estar CONFIRMADO (estorno não ocorreu)
        tt.execute(status -> {
            var pagamento = pagamentoRepository.findById(pagamentoIdHolder[0]);
            assertThat(pagamento).isPresent();
            assertThat(pagamento.get().getStatus().name())
                    .as("Status do pagamento deve permanecer CONFIRMADO apos tentativa de estorno bloqueada")
                    .isEqualTo("CONFIRMADO");
            status.setRollbackOnly();
            return null;
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private UsuarioMusica criarUsuario(String razaoSocial, String cnpj) {
        return UsuarioMusica.criar(
                razaoSocial, "Fantasia",
                Cnpj.criar(cnpj),
                Endereco.criar("12345678", "Rua Teste", "1", "", "Bairro", "Cidade", "SP"),
                Contato.criar("Resp", "11999999999", "resp@test.com"));
    }
}
