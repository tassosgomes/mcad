package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.AtualizarRubricaCommand;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AtualizarRubricaCommandHandlerTest {

    @Mock
    private RubricaRepository rubricaRepository;

    @Mock
    private OutboxEventWriter outboxEventWriter;

    private AtualizarRubricaCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new AtualizarRubricaCommandHandler(rubricaRepository, outboxEventWriter);
    }

    @Test
    void atualizarRubricaExistente_DeveAtualizarNomeEExigeClassificacaoEPublicarEvento() {
        // Arrange
        UUID id = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(id, "RADIO", "Rádio", false, true);
        when(rubricaRepository.findById(id)).thenReturn(Optional.of(rubrica));
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        var cmd = new AtualizarRubricaCommand(id, "Rádio FM", true, "admin");

        // Act
        RubricaResponse response = handler.handle(cmd);

        // Assert
        assertThat(response.nome()).isEqualTo("Rádio FM");
        assertThat(response.exigeClassificacao()).isTrue();
        verify(outboxEventWriter).addEvent(eq("arrecadacao.rubrica.atualizada"), anyString(), anyMap());
    }

    @Test
    void atualizarRubricaInexistente_DeveLancarEntidadeNaoEncontradaException() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(rubricaRepository.findById(id)).thenReturn(Optional.empty());

        var cmd = new AtualizarRubricaCommand(id, "Novo Nome", false, "admin");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(EntidadeNaoEncontradaException.class)
                .hasMessageContaining("Rubrica não encontrada");
    }
}
