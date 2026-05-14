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
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataLicencaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataOutboxEventRepository;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * IT de fluxo de estorno e recalculo de verba zerada (HU-02, RF-07, RF-10, task 9.4).
 *
 * <p>Verifica que após estorno de todos os pagamentos de um período:
 * <ul>
 *   <li>Verba permanece com valorBrutoTotal = 0, verbaLiquida = 0, qtdPagamentos = 0</li>
 *   <li>Registro de verba NÃO é excluído (RF-07)</li>
 *   <li>Evento {@code arrecadacao.verba.disponivel} é publicado com valores zerados (RF-10)</li>
 *   <li>Status permanece ABERTA após zerar (pode voltar a receber pagamentos)</li>
 * </ul>
 * </p>
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
class VerbaEstornoFlowIT {

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
    private SpringDataOutboxEventRepository outboxEventRepository;

    @Autowired
    private PlatformTransactionManager txManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private TransactionTemplate tt;
    private UUID rubricaId;
    private String rubricaSigla;

    @BeforeEach
    void setUp() {
        tt = new TransactionTemplate(txManager);

        // Garantir UDA vigente
        tt.execute(status -> {
            if (udaValorRepository.findVigente(LocalDate.now()).isEmpty()) {
                var uda = UdaValor.criar(new BigDecimal("107.31"), LocalDate.of(2020, 1, 1), "setup");
                udaValorRepository.save(uda);
            }
            return null;
        });

        // Criar rubrica
        String[] siglaHolder = new String[1];
        UUID[] idHolder = new UUID[1];
        tt.execute(status -> {
            siglaHolder[0] = "EST_" + UUID.randomUUID().toString().substring(0, 4);
            var rubrica = new Rubrica(UUID.randomUUID(), siglaHolder[0], "Rubrica Estorno IT", false);
            rubricaRepository.save(rubrica);
            idHolder[0] = rubrica.getId();
            return null;
        });
        rubricaId = idHolder[0];
        rubricaSigla = siglaHolder[0];
    }

    /**
     * Verifica que após estorno do único pagamento:
     * - Verba existe com valores zerados (RF-07)
     * - Status permanece ABERTA
     * - Evento verba.disponivel com zeros foi emitido (RF-10)
     */
    @Test
    void estornarUnicoPagamento_DeveZerarVerbaMasManterRegistro() {
        // Arrange — criar usuário e licença
        UUID[] licencaIdHolder = new UUID[1];
        UUID[] pagamentoIdHolder = new UUID[1];

        tt.execute(status -> {
            var usuario = UsuarioMusica.criar(
                    "Empresa Estorno Flow", "Fantasia",
                    Cnpj.criar("33027430000130"),
                    Endereco.criar("12345678", "Rua Teste", "1", "", "Bairro", "Cidade", "SP"),
                    Contato.criar("Resp", "11999999999", "resp@test.com"));
            usuarioMusicaRepository.save(usuario);
            var licenca = Licenca.criar(usuario.getId(), rubricaId, LocalDate.now(), null);
            licencaRepository.save(licenca);
            licencaIdHolder[0] = licenca.getId();
            return null;
        });

        // Registrar pagamento — cria verba automaticamente
        tt.execute(status -> {
            var cmd = new RegistrarPagamentoCommand(
                    licencaIdHolder[0],
                    new BigDecimal("5.0"),
                    "analista@ecad.org.br");
            var response = registrarPagamentoHandler.handle(cmd);
            pagamentoIdHolder[0] = response.id();
            return null;
        });

        // Verificar estado intermediário: verba ABERTA com valor > 0
        String periodoDoHandler = java.time.YearMonth.now().toString();
        tt.execute(status -> {
            var verba = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, periodoDoHandler);
            assertThat(verba).as("Verba deve existir apos pagamento").isPresent();
            assertThat(verba.get().getValorBrutoTotal())
                    .as("Bruto deve ser positivo antes do estorno")
                    .isGreaterThan(BigDecimal.ZERO);
            assertThat(verba.get().getQuantidadePagamentos())
                    .as("Quantidade deve ser 1 antes do estorno")
                    .isEqualTo(1);
            status.setRollbackOnly();
            return null;
        });

        // Act — estornar o pagamento
        tt.execute(status -> {
            var cmd = new EstornarPagamentoCommand(
                    pagamentoIdHolder[0],
                    "Estorno de teste — justificativa com mais de 10 caracteres.",
                    "analista@ecad.org.br");
            estornarPagamentoHandler.handle(cmd);
            return null;
        });

        // Assert — verba zerada mas ainda presente (RF-07)
        tt.execute(status -> {
            var verbaOpt = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, periodoDoHandler);
            assertThat(verbaOpt)
                    .as("Verba deve PERMANECER existente apos estorno total (RF-07 — nao excluir)")
                    .isPresent();

            Verba verba = verbaOpt.get();

            assertThat(verba.getValorBrutoTotal())
                    .as("Valor bruto deve ser zero apos estorno total")
                    .isEqualByComparingTo("0.00");

            assertThat(verba.getDeducaoEcad())
                    .as("Deducao ECAD deve ser zero")
                    .isEqualByComparingTo("0.00");

            assertThat(verba.getDeducaoAssociacoes())
                    .as("Deducao associacoes deve ser zero")
                    .isEqualByComparingTo("0.00");

            assertThat(verba.getVerbaLiquida())
                    .as("Verba liquida deve ser zero")
                    .isEqualByComparingTo("0.00");

            assertThat(verba.getQuantidadePagamentos())
                    .as("Quantidade de pagamentos deve ser zero")
                    .isEqualTo(0);

            assertThat(verba.getStatus())
                    .as("Status deve permanecer ABERTA (pode receber novos pagamentos)")
                    .isEqualTo(StatusVerba.ABERTA);

            status.setRollbackOnly();
            return null;
        });

        // Assert — evento verba.disponivel com valores zerados publicado (RF-10)
        tt.execute(status -> {
            String subjectEsperado = rubricaSigla + ":" + periodoDoHandler;

            // Verificar que existem eventos verba.disponivel para este subject
            // (pode haver mais de 1 — um após registrar e um após estornar)
            var eventosVerba = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.verba.disponivel".equals(e.getType()))
                    .filter(e -> e.getSubject().equals(subjectEsperado))
                    .toList();

            assertThat(eventosVerba)
                    .as("Deve haver ao menos 2 eventos verba.disponivel: um apos registrar e um apos estornar (RF-10)")
                    .hasSizeGreaterThanOrEqualTo(2);

            // O último evento (após estorno) deve conter valores zerados
            var ultimoEventoVerba = eventosVerba.get(eventosVerba.size() - 1);
            assertThat(ultimoEventoVerba.getPayload())
                    .as("Payload do evento apos estorno deve conter valorBrutoTotal zerado")
                    .contains("\"valorBrutoTotal\":\"0.00\"");

            status.setRollbackOnly();
            return null;
        });
    }
}
