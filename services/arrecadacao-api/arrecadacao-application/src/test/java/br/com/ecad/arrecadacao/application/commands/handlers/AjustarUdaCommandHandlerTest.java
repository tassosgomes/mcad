package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.GenericAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.AjustarUdaCommand;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import br.org.ecad.audit.sdk.AuditClient;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AjustarUdaCommandHandlerTest {

    @Mock
    private UdaValorRepository udaValorRepository;
    @Mock
    private AuditClient auditClient;
    @Mock
    private GenericAuditEventFactory auditFactory;
    @Mock
    private AuditContextProvider auditContextProvider;

    @InjectMocks
    private AjustarUdaCommandHandler handler;

    @Test
    void handle_ComValorValido_DeveCriarERetornarUdaResponse() {
        // Arrange
        BigDecimal valor = new BigDecimal("115.00");
        LocalDate dataVigencia = LocalDate.of(2026, 7, 1);
        AjustarUdaCommand cmd = new AjustarUdaCommand(valor, dataVigencia, "analista");

        UdaValor udaCriada = UdaValor.criar(valor, dataVigencia, "analista");
        when(udaValorRepository.save(any(UdaValor.class))).thenReturn(udaCriada);

        // Act
        UdaResponse response = handler.handle(cmd);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.valor()).isEqualTo(valor.toPlainString());
        assertThat(response.dataVigencia()).isEqualTo(dataVigencia);
        assertThat(response.criadoPor()).isEqualTo("analista");
        verify(udaValorRepository).save(any(UdaValor.class));
    }

    @Test
    void handle_ComValorZero_DeveLancarIllegalArgumentException() {
        // Arrange
        AjustarUdaCommand cmd = new AjustarUdaCommand(BigDecimal.ZERO, LocalDate.now(), "analista");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maior que zero");

        verify(udaValorRepository, never()).save(any());
    }

    @Test
    void handle_ComDataVigenciaNula_DeveLancarIllegalArgumentException() {
        // Arrange
        AjustarUdaCommand cmd = new AjustarUdaCommand(new BigDecimal("115.00"), null, "analista");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("nao pode ser nula");

        verify(udaValorRepository, never()).save(any());
    }
}
