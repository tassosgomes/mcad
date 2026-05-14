package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContext;
import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.PagamentoAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.RegistrarPagamentoCommand;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.exceptions.PagamentoDuplicadoException;
import br.com.ecad.arrecadacao.domain.exceptions.UdaVigenteNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaService;
import br.org.ecad.audit.sdk.AuditClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.slf4j.MDC;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RegistrarPagamentoCommandHandlerTest {

    @Mock private LicencaRepository licencaRepository;
    @Mock private UdaValorRepository udaValorRepository;
    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private VerbaService verbaService;
    @Mock private OutboxEventWriter outboxEventWriter;
    @Mock private AuditClient auditClient;
    @Mock private PagamentoAuditEventFactory auditEventFactory;
    @Mock private AuditContextProvider auditContextProvider;

    @InjectMocks
    private RegistrarPagamentoCommandHandler handler;

    private static final UUID LICENCA_ID = UUID.randomUUID();
    private static final UUID RUBRICA_ID = UUID.randomUUID();
    private static final BigDecimal QUANTIDADE_UDAS = new BigDecimal("2.5");
    private static final BigDecimal VALOR_UDA = new BigDecimal("107.31");

    /**
     * Cria licenca mockada com rubrica e rubricaId configurados.
     * Necessario porque o handler acessa licenca.getRubrica().getSigla() para MDC
     * e licenca.getRubricaId() para as chamadas ao VerbaService.
     */
    private Licenca criarLicencaMock(StatusLicenca status) {
        Rubrica rubricaMock = mock(Rubrica.class);
        when(rubricaMock.getSigla()).thenReturn("RADIO");

        Licenca licencaMock = mock(Licenca.class);
        when(licencaMock.getStatus()).thenReturn(status);
        when(licencaMock.getId()).thenReturn(LICENCA_ID);
        when(licencaMock.getRubricaId()).thenReturn(RUBRICA_ID);
        when(licencaMock.getRubrica()).thenReturn(rubricaMock);
        when(licencaMock.getUsuarioMusica()).thenReturn(null);

        return licencaMock;
    }

    @Test
    void handle_ComLicencaAtivaEUdaVigente_DeveRegistrarCalcularEPublicarEvento() {
        // Arrange
        Licenca licencaMock = criarLicencaMock(StatusLicenca.ATIVA);

        UdaValor udaMock = UdaValor.criar(VALOR_UDA, LocalDate.of(2026, 1, 1), null);

        Pagamento pagamentoSalvo = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.of(udaMock));
        when(pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(eq(LICENCA_ID), anyString()))
                .thenReturn(false);
        when(pagamentoRepository.save(any(Pagamento.class))).thenReturn(pagamentoSalvo);
        when(auditContextProvider.current("analista")).thenReturn(AuditContext.system("analista"));

        RegistrarPagamentoCommand cmd = new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista");

        // Act
        PagamentoResponse response = handler.handle(cmd);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.valorBruto()).isEqualTo(new BigDecimal("268.275000").toPlainString());
        assertThat(response.status()).isEqualTo("CONFIRMADO");

        // Verify: VerbaService chamado com argumentos corretos
        verify(verbaService).validarLockParaAlteracao(eq(RUBRICA_ID), anyString());
        verify(verbaService).recalcularVerba(eq(RUBRICA_ID), anyString());

        // Verify: evento Outbox publicado
        verify(outboxEventWriter).addEvent(
            eq("arrecadacao.pagamento.registrado"),
            anyString(),
            any()
        );
        verify(auditClient, times(2)).publish(any());
    }

    @Test
    void handle_ComLicencaSuspensa_DevePermitirRegistro() {
        // Arrange — licenca SUSPENSA tambem pode receber pagamento (RN-P01)
        Licenca licencaMock = criarLicencaMock(StatusLicenca.SUSPENSA);

        UdaValor udaMock = UdaValor.criar(VALOR_UDA, LocalDate.of(2026, 1, 1), null);
        Pagamento pagamentoSalvo = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.of(udaMock));
        when(pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(any(), any())).thenReturn(false);
        when(pagamentoRepository.save(any())).thenReturn(pagamentoSalvo);
        when(auditContextProvider.current("analista")).thenReturn(AuditContext.system("analista"));

        // Act
        PagamentoResponse response = handler.handle(
            new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista"));

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("CONFIRMADO");
        verify(auditClient, times(2)).publish(any());
    }

    @Test
    void handle_ComLicencaNaoEncontrada_DeveLancar404() {
        // Arrange
        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(
            new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista")))
                .isInstanceOf(EntidadeNaoEncontradaException.class)
                .hasMessageContaining("Licenca nao encontrada");

        verify(pagamentoRepository, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
        verify(auditClient, never()).publish(any());
    }

    @Test
    void handle_ComLicencaEncerrada_DeveLancarIllegalState_422() {
        // Arrange
        Licenca licencaMock = mock(Licenca.class);
        when(licencaMock.getStatus()).thenReturn(StatusLicenca.ENCERRADA);
        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(
            new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ENCERRADA");

        verify(pagamentoRepository, never()).save(any());
        verify(auditClient, never()).publish(any());
    }

    @Test
    void handle_SemUdaVigente_DeveLancarUdaVigenteNaoEncontrada_422() {
        // Arrange
        Licenca licencaMock = mock(Licenca.class);
        when(licencaMock.getStatus()).thenReturn(StatusLicenca.ATIVA);
        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(
            new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista")))
                .isInstanceOf(UdaVigenteNaoEncontradaException.class)
                .hasMessageContaining("UDA vigente");

        verify(pagamentoRepository, never()).save(any());
        verify(auditClient, never()).publish(any());
    }

    @Test
    void handle_ComPagamentoDuplicadoNoPeriodo_DeveLancarPagamentoDuplicado_409() {
        // Arrange
        Licenca licencaMock = mock(Licenca.class);
        when(licencaMock.getStatus()).thenReturn(StatusLicenca.ATIVA);
        UdaValor udaMock = UdaValor.criar(VALOR_UDA, LocalDate.of(2026, 1, 1), null);

        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.of(udaMock));
        when(pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(eq(LICENCA_ID), anyString()))
                .thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(
            new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista")))
                .isInstanceOf(PagamentoDuplicadoException.class)
                .hasMessageContaining("pagamento confirmado");

        verify(pagamentoRepository, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
        verify(auditClient, never()).publish(any());
    }

    @Test
    void handle_VerbaEmDistribuicao_DeveRejeitar() {
        // Arrange — VerbaService lanca VerbaEmDistribuicaoException ao validar lock
        Licenca licencaMock = criarLicencaMock(StatusLicenca.ATIVA);

        UdaValor udaMock = UdaValor.criar(VALOR_UDA, LocalDate.of(2026, 1, 1), null);

        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.of(udaMock));
        when(pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(eq(LICENCA_ID), anyString()))
                .thenReturn(false);
        doThrow(new VerbaEmDistribuicaoException("Verba em distribuicao para o periodo"))
                .when(verbaService).validarLockParaAlteracao(any(), any());

        RegistrarPagamentoCommand cmd = new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(VerbaEmDistribuicaoException.class)
                .hasMessageContaining("distribuicao");

        // Verify: pagamento NAO foi salvo e evento NAO foi emitido
        verify(pagamentoRepository, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
    }

    /**
     * Garante isolamento entre execucoes: MDC e populado dentro de handle()
     * e limpo no bloco finally, evitando vazamento entre threads do pool.
     *
     * <p>Producao usa as chaves MDC "rubrica" (sigla) e "periodo" — divergente do
     * comentario do TODO original ("rubricaSigla"). Este teste pina o comportamento
     * real.</p>
     */
    @BeforeEach
    void limparMdcAntes() {
        MDC.clear();
    }

    @AfterEach
    void limparMdcDepois() {
        MDC.clear();
    }

    @Test
    void handle_DeveLimparMdcAposExecucao() {
        // Arrange — happy path identico ao teste de registro feliz
        Licenca licencaMock = criarLicencaMock(StatusLicenca.ATIVA);
        UdaValor udaMock = UdaValor.criar(VALOR_UDA, LocalDate.of(2026, 1, 1), null);
        Pagamento pagamentoSalvo = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.of(udaMock));
        when(pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(eq(LICENCA_ID), anyString()))
                .thenReturn(false);
        when(pagamentoRepository.save(any(Pagamento.class))).thenReturn(pagamentoSalvo);
        when(auditContextProvider.current("analista")).thenReturn(AuditContext.system("analista"));

        // Captura MDC durante handle() via Answer no recalcularVerba (chamado apos MDC.put)
        AtomicReference<String> rubricaDuranteHandle = new AtomicReference<>();
        AtomicReference<String> periodoDuranteHandle = new AtomicReference<>();
        doAnswer(inv -> {
            rubricaDuranteHandle.set(MDC.get("rubrica"));
            periodoDuranteHandle.set(MDC.get("periodo"));
            return null;
        }).when(verbaService).recalcularVerba(any(), anyString());

        // Pre-condicao: MDC limpo
        assertThat(MDC.get("rubrica")).isNull();
        assertThat(MDC.get("periodo")).isNull();

        RegistrarPagamentoCommand cmd = new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista");

        // Act
        handler.handle(cmd);

        // Assert — MDC foi populado durante handle()
        assertThat(rubricaDuranteHandle.get())
                .as("MDC[rubrica] deve estar populado durante handle()")
                .isEqualTo("RADIO");
        assertThat(periodoDuranteHandle.get())
                .as("MDC[periodo] deve estar populado durante handle()")
                .isNotNull()
                .matches("\\d{4}-\\d{2}");

        // Assert — MDC limpo apos handle() (finally executou)
        assertThat(MDC.get("rubrica"))
                .as("MDC[rubrica] deve ser removido no finally")
                .isNull();
        assertThat(MDC.get("periodo"))
                .as("MDC[periodo] deve ser removido no finally")
                .isNull();
    }
}
