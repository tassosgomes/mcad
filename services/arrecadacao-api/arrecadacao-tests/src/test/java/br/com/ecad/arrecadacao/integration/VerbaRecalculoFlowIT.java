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
import br.com.ecad.arrecadacao.infra.events.OutboxPublisherWorker;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataOutboxEventRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataLicencaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataRubricaRepository;
import br.com.ecad.arrecadacao.infra.persistence.JpaUdaValorRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataUsuarioMusicaRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

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
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
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

    @Autowired
    private OutboxPublisherWorker outboxPublisherWorker;

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

    /**
     * Verifica que uma falha do publisher (RabbitTemplate lanca AmqpException) deixa
     * o evento no outbox com {@code attempts} incrementado e {@code publishedAt} nulo,
     * e que uma nova execucao do worker re-publica o MESMO evento (mesmo CloudEvent id)
     * sem criar uma nova linha em {@code outbox_events} — garantindo a propriedade
     * "at-least-once com idempotency_key" do Outbox Pattern.
     *
     * <p>Idempotency_key e o {@code OutboxEvent.id} (UUID), reutilizado como
     * {@code messageId} AMQP em todas as retentativas — consumers podem deduplicar
     * com base nele.</p>
     */
    @Test
    void outboxFailureShouldRetryWithoutDuplicatingEvent() {
        TransactionTemplate tt = new TransactionTemplate(txManager);

        // Setup: registra 1 pagamento, gerando eventos no outbox (verba.disponivel + pagamento.registrado)
        UUID[] licencaIdHolder = new UUID[1];
        tt.execute(status -> {
            var usuario = UsuarioMusica.criar(
                    "Empresa OutboxRetry",
                    "Fantasia OR",
                    Cnpj.criar(gerarCnpjAleatorioValido()),
                    Endereco.criar("12345678", "Rua Outbox", "1", "", "Bairro", "Cidade", "SP"),
                    Contato.criar("Resp OR", "11999999999", "or@test.com"));
            usuarioMusicaRepository.save(usuario);

            var licenca = Licenca.criar(usuario.getId(), rubricaId, LocalDate.now(), null);
            licencaRepository.save(licenca);
            licencaIdHolder[0] = licenca.getId();
            return null;
        });

        tt.execute(status -> {
            var cmd = new RegistrarPagamentoCommand(
                    licencaIdHolder[0],
                    new BigDecimal("5.0"),
                    "analista@ecad.org.br");
            registrarPagamentoHandler.handle(cmd);
            return null;
        });

        // Sanity check: outbox tem eventos pendentes
        long pendentesAntes = outboxEventRepository.findAll().stream()
                .filter(e -> e.getPublishedAt() == null)
                .filter(e -> e.getRoutingKey().startsWith("arrecadacao."))
                .count();
        assertThat(pendentesAntes)
                .as("Setup deve ter gerado eventos pendentes no outbox")
                .isGreaterThanOrEqualTo(2);

        // Captura os messageIds (CloudEvent ids) enviados ao RabbitTemplate em cada chamada
        List<String> messageIdsEnviados = new ArrayList<>();
        AtomicInteger chamadasSend = new AtomicInteger();

        // Stub: 1a chamada de cada evento falha; demais sucedem.
        // Estrategia simples: TODAS as chamadas da PRIMEIRA execucao falham,
        // todas as chamadas da SEGUNDA sucedem.
        Mockito.reset(rabbitTemplate);
        final boolean[] failNext = {true};
        Mockito.doAnswer(inv -> {
            Message msg = inv.getArgument(2, Message.class);
            String id = msg.getMessageProperties().getMessageId();
            messageIdsEnviados.add(id);
            chamadasSend.incrementAndGet();
            if (failNext[0]) {
                throw new AmqpException("Falha simulada do broker");
            }
            return null;
        }).when(rabbitTemplate).send(Mockito.anyString(), Mockito.anyString(), Mockito.any(Message.class));

        long totalEventsAntes = outboxEventRepository.count();

        // Act 1 — primeira execucao do worker: todos falham
        outboxPublisherWorker.publishPendingEvents();

        // Coleta ids enviados na 1a rodada (snapshot antes do reset do flag)
        List<String> idsRodada1 = new ArrayList<>(messageIdsEnviados);
        int chamadasRodada1 = chamadasSend.get();

        // Assert intermediario — eventos ainda pendentes, com attempts >= 1, e zero linhas novas
        long totalEventsDepoisRodada1 = outboxEventRepository.count();
        assertThat(totalEventsDepoisRodada1)
                .as("Falha do publisher NAO deve criar novas linhas em outbox_events")
                .isEqualTo(totalEventsAntes);

        long pendentesDepoisRodada1 = outboxEventRepository.findAll().stream()
                .filter(e -> e.getPublishedAt() == null)
                .filter(e -> e.getRoutingKey().startsWith("arrecadacao."))
                .count();
        assertThat(pendentesDepoisRodada1)
                .as("Eventos devem permanecer pendentes apos falha do publisher")
                .isEqualTo(pendentesAntes);

        outboxEventRepository.findAll().stream()
                .filter(e -> e.getPublishedAt() == null)
                .filter(e -> e.getRoutingKey().startsWith("arrecadacao."))
                .forEach(e -> assertThat(e.getAttempts())
                        .as("Evento %s deve ter attempts incrementado para 1 apos falha".formatted(e.getId()))
                        .isEqualTo(1));

        // Act 2 — segunda execucao do worker: agora sucede
        failNext[0] = false;
        outboxPublisherWorker.publishPendingEvents();

        // Assert final — todos os eventos foram publicados
        long pendentesDepoisRodada2 = outboxEventRepository.findAll().stream()
                .filter(e -> e.getPublishedAt() == null)
                .filter(e -> e.getRoutingKey().startsWith("arrecadacao."))
                .count();
        assertThat(pendentesDepoisRodada2)
                .as("Apos retry bem-sucedido, nao deve haver eventos pendentes")
                .isZero();

        long totalEventsDepoisRodada2 = outboxEventRepository.count();
        assertThat(totalEventsDepoisRodada2)
                .as("Retry NAO pode criar linhas duplicadas — count deve permanecer igual")
                .isEqualTo(totalEventsAntes);

        // Ids enviados na rodada 2 devem ser exatamente os mesmos da rodada 1 (idempotency_key)
        List<String> idsRodada2 = messageIdsEnviados.subList(chamadasRodada1, messageIdsEnviados.size());
        assertThat(idsRodada2)
                .as("Retry deve reutilizar mesmos CloudEvent ids (idempotency_key) — sem novos ids")
                .containsExactlyInAnyOrderElementsOf(idsRodada1);
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
            case 0 -> "95917128000120";
            case 1 -> "77257601000109";
            case 2 -> "08673009000175";
            default -> throw new IllegalArgumentException("Indice nao suportado: " + idx);
        };
    }

    /**
     * Gera CNPJ valido aleatorio (mod-11) — usado quando o teste pode rodar varias vezes
     * contra o mesmo banco e nao podemos depender de constantes (chave unica em cnpj).
     */
    private static String gerarCnpjAleatorioValido() {
        java.util.Random r = new java.util.Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            sb.append(r.nextInt(10));
        }
        int[] w1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum1 = 0;
        for (int i = 0; i < 12; i++) sum1 += (sb.charAt(i) - '0') * w1[i];
        int rest1 = sum1 % 11;
        int dv1 = rest1 < 2 ? 0 : 11 - rest1;
        sb.append(dv1);
        int[] w2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum2 = 0;
        for (int i = 0; i < 13; i++) sum2 += (sb.charAt(i) - '0') * w2[i];
        int rest2 = sum2 % 11;
        int dv2 = rest2 < 2 ? 0 : 11 - rest2;
        sb.append(dv2);
        return sb.toString();
    }
}
