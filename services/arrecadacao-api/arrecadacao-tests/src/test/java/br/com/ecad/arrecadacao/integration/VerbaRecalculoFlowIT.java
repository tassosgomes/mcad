package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.application.commands.RegistrarPagamentoCommand;
import br.com.ecad.arrecadacao.application.commands.handlers.RegistrarPagamentoCommandHandler;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataOutboxEventRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataLicencaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import br.com.ecad.arrecadacao.infra.persistence.JpaUdaValorRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataUsuarioMusicaRepository;
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
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * IT de fluxo end-to-end do cálculo de verba líquida (HU-01, task 9.2).
 *
 * <p>Registra 3 pagamentos via {@link RegistrarPagamentoCommandHandler} real
 * (usando {@link br.com.ecad.arrecadacao.infra.services.VerbaServiceImpl})
 * e verifica que:
 * <ul>
 *   <li>1 linha em {@code arrecadacao.verbas} com bruto = soma, líquida = 85%, qtd = 3</li>
 *   <li>3 eventos {@code arrecadacao.verba.disponivel} em {@code arrecadacao.outbox_events}</li>
 *   <li>3 eventos {@code arrecadacao.pagamento.registrado}</li>
 * </ul>
 * </p>
 *
 * <p><b>Nota:</b> NÃO importa {@link br.com.ecad.arrecadacao.config.VerbaServiceTestConfig}
 * para que a implementação real {@code VerbaServiceImpl} seja usada no lugar do stub.</p>
 */
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration")
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class VerbaRecalculoFlowIT {

    @Autowired
    private RegistrarPagamentoCommandHandler registrarPagamentoHandler;

    @Autowired
    private VerbaRepository verbaRepository;

    @Autowired
    private SpringDataOutboxEventRepository outboxEventRepository;

    @Autowired
    private SpringDataRubricaRepository rubricaRepository;

    @Autowired
    private SpringDataUsuarioMusicaRepository usuarioMusicaRepository;

    @Autowired
    private SpringDataLicencaRepository licencaRepository;

    @Autowired
    private JpaUdaValorRepository udaValorRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PlatformTransactionManager txManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    private UUID rubricaId;
    private String periodo;

    @BeforeEach
    void setUp() {
        TransactionTemplate tt = new TransactionTemplate(txManager);

        // Criar UDA vigente se não existir (data futura para garantir vigência)
        tt.execute(status -> {
            if (udaValorRepository.findVigente(LocalDate.now()).isEmpty()) {
                var uda = UdaValor.criar(new BigDecimal("107.31"), LocalDate.of(2020, 1, 1), "setup");
                udaValorRepository.save(uda);
            }
            return null;
        });

        // Criar rubrica e usuários em transação separada
        UUID[] rubricaIdHolder = new UUID[1];
        tt.execute(status -> {
            var rubrica = new Rubrica(UUID.randomUUID(),
                    "RADIO_FL_" + UUID.randomUUID().toString().substring(0, 4),
                    "Rubrica Flow IT", false);
            rubricaRepository.save(rubrica);
            rubricaIdHolder[0] = rubrica.getId();
            return null;
        });
        rubricaId = rubricaIdHolder[0];
        periodo = java.time.YearMonth.now().toString();
    }

    /**
     * Registra 3 pagamentos via handler real e verifica verba + outbox.
     *
     * <p>Cada pagamento usa uma licença distinta para evitar constraint unique
     * (licenca+periodo+CONFIRMADO). A verba deve acumular os 3 pagamentos.</p>
     */
    @Test
    void registrar3Pagamentos_DeveCalcularVerbaCorretamente() {
        TransactionTemplate tt = new TransactionTemplate(txManager);

        // Criar 3 usuários e licenças distintas para a mesma rubrica
        UUID[] licencaIds = new UUID[3];
        BigDecimal[] quantidadesUda = {
            new BigDecimal("5.0"),
            new BigDecimal("3.0"),
            new BigDecimal("2.0")
        };

        for (int i = 0; i < 3; i++) {
            final int idx = i;
            tt.execute(status -> {
                String cnpj = gerarCnpjUnico(idx);
                var usuario = UsuarioMusica.criar(
                        "Empresa Flow " + idx,
                        "Fantasia " + idx,
                        Cnpj.criar(cnpj),
                        Endereco.criar("12345678", "Rua Teste", "1", "", "Bairro", "Cidade", "SP"),
                        Contato.criar("Resp", "11999999999", "resp" + idx + "@test.com"));
                usuarioMusicaRepository.save(usuario);

                var licenca = Licenca.criar(usuario.getId(), rubricaId, LocalDate.now(), null);
                licencaRepository.save(licenca);
                licencaIds[idx] = licenca.getId();
                return null;
            });
        }

        // Act — registrar os 3 pagamentos via handler real (cada um em transação própria)
        for (int i = 0; i < 3; i++) {
            final int idx = i;
            tt.execute(status -> {
                var cmd = new RegistrarPagamentoCommand(
                        licencaIds[idx],
                        quantidadesUda[idx],
                        "analista@ecad.org.br");
                registrarPagamentoHandler.handle(cmd);
                return null;
            });
        }

        // Assert — verificar verba resultante
        tt.execute(status -> {
            var verbaOpt = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, periodo);
            assertThat(verbaOpt).as("Verba deve existir para rubrica+periodo").isPresent();

            Verba verba = verbaOpt.get();

            // bruto = (5 + 3 + 2) * 107.31 = 10 * 107.31 = 1073.10
            assertThat(verba.getValorBrutoTotal())
                    .as("Valor bruto deve ser soma de todos os pagamentos CONFIRMADOS")
                    .isEqualByComparingTo("1073.10");

            // deducaoEcad = 1073.10 * 0.10 = 107.31
            assertThat(verba.getDeducaoEcad())
                    .as("Deducao ECAD deve ser 10% do bruto")
                    .isEqualByComparingTo("107.31");

            // deducaoAssociacoes = 1073.10 * 0.05 = 53.66 (arredondado HALF_UP)
            assertThat(verba.getDeducaoAssociacoes())
                    .as("Deducao associacoes deve ser 5% do bruto")
                    .isEqualByComparingTo("53.66");

            // liquida = 1073.10 - 107.31 - 53.66 = 912.13
            assertThat(verba.getVerbaLiquida())
                    .as("Verba liquida deve ser 85% do bruto (por subtracao)")
                    .isEqualByComparingTo("912.13");

            assertThat(verba.getQuantidadePagamentos())
                    .as("Quantidade de pagamentos deve ser 3")
                    .isEqualTo(3);

            status.setRollbackOnly(); // read-only assertion
            return null;
        });

        // Assert — verificar eventos no outbox
        tt.execute(status -> {
            var outboxEvents = outboxEventRepository.findAll().stream()
                    .filter(e -> e.getRoutingKey().startsWith("arrecadacao."))
                    .toList();

            long eventosVerbaDisponivel = outboxEvents.stream()
                    .filter(e -> "arrecadacao.verba.disponivel".equals(e.getType()))
                    .filter(e -> e.getSubject().startsWith(getRubricaSiglaFromDb()))
                    .count();

            long eventosPagamentoRegistrado = outboxEvents.stream()
                    .filter(e -> "arrecadacao.pagamento.registrado".equals(e.getType()))
                    .count();

            assertThat(eventosVerbaDisponivel)
                    .as("Deve haver 3 eventos arrecadacao.verba.disponivel (um por pagamento)")
                    .isGreaterThanOrEqualTo(3);

            assertThat(eventosPagamentoRegistrado)
                    .as("Deve haver ao menos 3 eventos arrecadacao.pagamento.registrado")
                    .isGreaterThanOrEqualTo(3);

            status.setRollbackOnly();
            return null;
        });
    }

    private String getRubricaSiglaFromDb() {
        return rubricaRepository.findById(rubricaId)
                .map(r -> r.getSigla())
                .orElse("");
    }

    /**
     * Gera CNPJs de teste únicos por índice, usando CNPJs válidos pré-calculados.
     * Em produção real, usaríamos um gerador de CNPJ válido.
     */
    private static String gerarCnpjUnico(int idx) {
        return switch (idx) {
            case 0 -> "40170361000190";
            case 1 -> "13617088000172";
            case 2 -> "88199700000150";
            default -> throw new IllegalArgumentException("Indice nao suportado: " + idx);
        };
    }
}
