package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.AtivarRubricaCommand;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AtivarRubricaCommandHandlerTest {

    @Mock
    private RubricaRepository rubricaRepository;

    @Mock
    private OutboxEventWriter outboxEventWriter;

    private AtivarRubricaCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new AtivarRubricaCommandHandler(rubricaRepository, outboxEventWriter);
    }

    @Test
    void ativarRubricaInativa_DeveMudarStatusParaTrueEPublicarEvento() {
        // Arrange
        UUID id = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(id, "RADIO", "Rádio", false, false);
        when(rubricaRepository.findById(id)).thenReturn(Optional.of(rubrica));
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        var cmd = new AtivarRubricaCommand(id, "Reativacao solicitada", "admin");

        // Act
        RubricaResponse response = handler.handle(cmd);

        // Assert
        assertThat(response.ativo()).isTrue();
        verify(outboxEventWriter).addEvent(eq("arrecadacao.rubrica.atualizada"), anyString(), anyMap());
    }

    @Test
    void ativarRubricaJaAtiva_DeveLancarIllegalStateException() {
        // Arrange
        UUID id = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(id, "RADIO", "Rádio", false, true);
        when(rubricaRepository.findById(id)).thenReturn(Optional.of(rubrica));

        var cmd = new AtivarRubricaCommand(id, "Reativacao solicitada", "admin");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Rubrica já está ativa");

        verify(outboxEventWriter, never()).addEvent(anyString(), anyString(), anyMap());
    }

    @Test
    void ativarRubricaInexistente_DeveLancarEntidadeNaoEncontradaException() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(rubricaRepository.findById(id)).thenReturn(Optional.empty());

        var cmd = new AtivarRubricaCommand(id, "Reativacao solicitada", "admin");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(EntidadeNaoEncontradaException.class)
                .hasMessageContaining("Rubrica não encontrada");
    }
}
