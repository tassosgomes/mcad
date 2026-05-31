package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
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

    private static final String ACTOR_SUBJECT = "logto-user-uda";
    private static final String ACTOR_LABEL = "Ana Lima (ana.lima)";

    @Test
    void handle_ComValorValido_DeveCriarERetornarUdaResponse() {
        // Arrange
        BigDecimal valor = new BigDecimal("115.00");
        LocalDate dataVigencia = LocalDate.of(2026, 7, 1);
        AjustarUdaCommand cmd = new AjustarUdaCommand(valor, dataVigencia, actorSnapshot());

        when(udaValorRepository.save(any(UdaValor.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UdaResponse response = handler.handle(cmd);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.valor()).isEqualTo(valor.toPlainString());
        assertThat(response.dataVigencia()).isEqualTo(dataVigencia);
        assertThat(response.criadoPor()).isEqualTo(ACTOR_LABEL);
        verify(udaValorRepository).save(any(UdaValor.class));
    }

    @Test
    void handle_ComActorSnapshot_DevePersistirSubjectRotuloELegado() {
        // Arrange
        BigDecimal valor = new BigDecimal("115.00");
        LocalDate dataVigencia = LocalDate.of(2026, 7, 1);
        AjustarUdaCommand cmd = new AjustarUdaCommand(valor, dataVigencia, actorSnapshot());
        when(udaValorRepository.save(any(UdaValor.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        handler.handle(cmd);

        // Assert
        var captor = org.mockito.ArgumentCaptor.forClass(UdaValor.class);
        verify(udaValorRepository).save(captor.capture());
        UdaValor saved = captor.getValue();
        assertThat(saved.getCriadoPorSubject()).isEqualTo(ACTOR_SUBJECT);
        assertThat(saved.getCriadoPorRotulo()).isEqualTo(ACTOR_LABEL);
        assertThat(saved.getCriadoPor()).isEqualTo(ACTOR_LABEL);
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

    private ActorSnapshot actorSnapshot() {
        return new ActorSnapshot(ACTOR_SUBJECT, ACTOR_LABEL, "ana.lima", "Ana Lima", "ana@mcad.dev");
    }
}
