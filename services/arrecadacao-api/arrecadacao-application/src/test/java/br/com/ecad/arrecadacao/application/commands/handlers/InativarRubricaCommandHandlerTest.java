package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.InativarRubricaCommand;
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
class InativarRubricaCommandHandlerTest {

    @Mock
    private RubricaRepository rubricaRepository;

    @Mock
    private OutboxEventWriter outboxEventWriter;

    private InativarRubricaCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new InativarRubricaCommandHandler(rubricaRepository, outboxEventWriter);
    }

    @Test
    void inativarRubricaAtiva_DeveMudarStatusEPublicarEvento() {
        // Arrange
        UUID id = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(id, "RADIO", "Rádio", false, true);
        when(rubricaRepository.findById(id)).thenReturn(Optional.of(rubrica));
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        var cmd = new InativarRubricaCommand(id, "Obsoleto", "admin");

        // Act
        RubricaResponse response = handler.handle(cmd);

        // Assert
        assertThat(response.ativo()).isFalse();
        verify(outboxEventWriter).addEvent(eq("arrecadacao.rubrica.atualizada"), anyString(), anyMap());
    }

    @Test
    void inativarRubricaJaInativa_DeveLancarIllegalStateException() {
        // Arrange
        UUID id = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(id, "RADIO", "Rádio", false, false);
        when(rubricaRepository.findById(id)).thenReturn(Optional.of(rubrica));

        var cmd = new InativarRubricaCommand(id, "Obsoleto", "admin");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Rubrica já está inativa");

        verify(outboxEventWriter, never()).addEvent(anyString(), anyString(), anyMap());
    }

    @Test
    void inativarRubricaInexistente_DeveLancarEntidadeNaoEncontradaException() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(rubricaRepository.findById(id)).thenReturn(Optional.empty());

        var cmd = new InativarRubricaCommand(id, "Obsoleto", "admin");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(EntidadeNaoEncontradaException.class)
                .hasMessageContaining("Rubrica não encontrada");
    }
}
