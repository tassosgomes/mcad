package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.RegistrarPagamentoCommand;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.exceptions.PagamentoDuplicadoException;
import br.com.ecad.arrecadacao.domain.exceptions.UdaVigenteNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class RegistrarPagamentoCommandHandlerTest {

    @Mock private LicencaRepository licencaRepository;
    @Mock private UdaValorRepository udaValorRepository;
    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private OutboxEventWriter outboxEventWriter;

    @InjectMocks
    private RegistrarPagamentoCommandHandler handler;

    private static final UUID LICENCA_ID = UUID.randomUUID();
    private static final BigDecimal QUANTIDADE_UDAS = new BigDecimal("2.5");
    private static final BigDecimal VALOR_UDA = new BigDecimal("107.31");

    @Test
    void handle_ComLicencaAtivaEUdaVigente_DeveRegistrarCalcularEPublicarEvento() {
        // Arrange
        Licenca licencaMock = mock(Licenca.class);
        when(licencaMock.getStatus()).thenReturn(StatusLicenca.ATIVA);
        when(licencaMock.getId()).thenReturn(LICENCA_ID);

        UdaValor udaMock = UdaValor.criar(VALOR_UDA, LocalDate.of(2026, 1, 1), null);

        Pagamento pagamentoSalvo = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.of(udaMock));
        when(pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(eq(LICENCA_ID), anyString()))
                .thenReturn(false);
        when(pagamentoRepository.save(any(Pagamento.class))).thenReturn(pagamentoSalvo);

        RegistrarPagamentoCommand cmd = new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista");

        // Act
        PagamentoResponse response = handler.handle(cmd);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.valorBruto()).isEqualTo(new BigDecimal("268.275000").toPlainString());
        assertThat(response.status()).isEqualTo("CONFIRMADO");

        // Verify: evento Outbox publicado
        verify(outboxEventWriter).addEvent(
            eq("arrecadacao.pagamento.registrado"),
            anyString(),
            any()
        );
    }

    @Test
    void handle_ComLicencaSuspensa_DevePermitirRegistro() {
        // Arrange — licenca SUSPENSA tambem pode receber pagamento (RN-P01)
        Licenca licencaMock = mock(Licenca.class);
        when(licencaMock.getStatus()).thenReturn(StatusLicenca.SUSPENSA);
        when(licencaMock.getId()).thenReturn(LICENCA_ID);

        UdaValor udaMock = UdaValor.criar(VALOR_UDA, LocalDate.of(2026, 1, 1), null);
        Pagamento pagamentoSalvo = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        when(licencaRepository.findById(LICENCA_ID)).thenReturn(Optional.of(licencaMock));
        when(udaValorRepository.findVigente(any(LocalDate.class))).thenReturn(Optional.of(udaMock));
        when(pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(any(), any())).thenReturn(false);
        when(pagamentoRepository.save(any())).thenReturn(pagamentoSalvo);

        // Act
        PagamentoResponse response = handler.handle(
            new RegistrarPagamentoCommand(LICENCA_ID, QUANTIDADE_UDAS, "analista"));

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("CONFIRMADO");
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
    }
}
