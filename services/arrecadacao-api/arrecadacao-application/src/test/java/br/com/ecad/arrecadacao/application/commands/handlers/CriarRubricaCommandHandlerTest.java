package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.CriarRubricaCommand;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.services.SiglaSuggester;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
class CriarRubricaCommandHandlerTest {

    @Mock
    private RubricaRepository rubricaRepository;

    @Mock
    private SiglaSuggester siglaSuggester;

    @Mock
    private OutboxEventWriter outboxEventWriter;

    private CriarRubricaCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new CriarRubricaCommandHandler(rubricaRepository, siglaSuggester, outboxEventWriter);
    }

    @Test
    void criarComSiglaSugerida_DeveGerarSiglaESalvar() {
        // Arrange
        when(siglaSuggester.sugerir("Rádio")).thenReturn("RADIO");
        when(rubricaRepository.existsBySigla("RADIO")).thenReturn(false);
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        var cmd = new CriarRubricaCommand("Rádio", false, null, "admin");

        // Act
        var response = handler.handle(cmd);

        // Assert
        assertThat(response.sigla()).isEqualTo("RADIO");
        assertThat(response.ativo()).isTrue();
        verify(outboxEventWriter).addEvent(eq("arrecadacao.rubrica.atualizada"), anyString(), anyMap());
    }

    @Test
    void criarComSiglaDuplicada_DeveLancarIllegalArgumentException() {
        // Arrange
        when(rubricaRepository.existsBySigla("RADIO")).thenReturn(true);

        var cmd = new CriarRubricaCommand("Rádio", false, "RADIO", "admin");

        // Act & Assert
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Sigla já existe: RADIO");

        verify(rubricaRepository, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(anyString(), anyString(), anyMap());
    }

    @Test
    void criarComSiglaExplicita_DeveUsarSiglaFornecida() {
        // Arrange
        when(rubricaRepository.existsBySigla("PODCAST")).thenReturn(false);
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        var cmd = new CriarRubricaCommand("Podcast", true, "PODCAST", "admin");

        // Act
        var response = handler.handle(cmd);

        // Assert
        assertThat(response.sigla()).isEqualTo("PODCAST");
        assertThat(response.exigeClassificacao()).isTrue();
        verify(siglaSuggester, never()).sugerir(anyString());
        verify(outboxEventWriter).addEvent(eq("arrecadacao.rubrica.atualizada"), anyString(), anyMap());
    }
}
