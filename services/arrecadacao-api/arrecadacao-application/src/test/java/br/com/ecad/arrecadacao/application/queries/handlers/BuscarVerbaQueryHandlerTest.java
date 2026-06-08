package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.queries.BuscarVerbaQuery;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BuscarVerbaQueryHandlerTest {

    @Mock
    private VerbaRepository verbaRepository;

    @Mock
    private RubricaRepository rubricaRepository;

    @Mock
    private ListarVerbasQueryHandler listarVerbasQueryHandler;

    @InjectMocks
    private BuscarVerbaQueryHandler handler;

    @Test
    void buscar_HappyPath_RetornaVerbaResponse() {
        // Arrange
        UUID rubricaId = UUID.randomUUID();
        UUID verbaId = UUID.randomUUID();
        Instant agora = Instant.now();

        Rubrica rubrica = new Rubrica(rubricaId, "RADIO", "Radio AM/FM", false);
        Verba verba = mock(Verba.class);

        when(rubricaRepository.findBySigla("RADIO")).thenReturn(Optional.of(rubrica));
        when(verbaRepository.findByRubricaIdAndPeriodo(rubricaId, "2026-04")).thenReturn(Optional.of(verba));

        var expectedResponse = new br.com.ecad.arrecadacao.application.dto.VerbaResponse(
                verbaId,
                new br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse(rubricaId, "RADIO", "Radio AM/FM", true),
                "2026-04",
                "1073.10",
                "107.31",
                "53.66",
                "912.13",
                3,
                "ABERTA",
                agora
        );
        when(listarVerbasQueryHandler.toResponse(verba)).thenReturn(expectedResponse);

        // Act
        var result = handler.handle(new BuscarVerbaQuery("RADIO", "2026-04"));

        // Assert
        assertNotNull(result);
        assertEquals(verbaId, result.id());
        assertEquals("RADIO", result.rubrica().sigla());
        assertEquals("2026-04", result.periodo());
        assertEquals("1073.10", result.valorBrutoTotal());
        assertEquals("ABERTA", result.status());
    }

    @Test
    void buscar_QuandoRubricaNaoExiste_LancaEntidadeNaoEncontradaException() {
        // Arrange
        when(rubricaRepository.findBySigla("INEXISTENTE")).thenReturn(Optional.empty());

        // Act & Assert
        var ex = assertThrows(EntidadeNaoEncontradaException.class,
                () -> handler.handle(new BuscarVerbaQuery("INEXISTENTE", "2026-04")));

        assertTrue(ex.getMessage().contains("INEXISTENTE"));
        verify(verbaRepository, never()).findByRubricaIdAndPeriodo(any(), any());
    }

    @Test
    void buscar_QuandoVerbaNaoExiste_LancaEntidadeNaoEncontradaException() {
        // Arrange
        UUID rubricaId = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(rubricaId, "RADIO", "Radio AM/FM", false);

        when(rubricaRepository.findBySigla("RADIO")).thenReturn(Optional.of(rubrica));
        when(verbaRepository.findByRubricaIdAndPeriodo(rubricaId, "2026-04")).thenReturn(Optional.empty());

        // Act & Assert
        var ex = assertThrows(EntidadeNaoEncontradaException.class,
                () -> handler.handle(new BuscarVerbaQuery("RADIO", "2026-04")));

        assertTrue(ex.getMessage().contains("RADIO"));
        assertTrue(ex.getMessage().contains("2026-04"));
    }

    @Test
    void buscar_QuandoRubricaExisteMasVerbaNaoExisteParaPeriodo_LancaEntidadeNaoEncontradaException() {
        // Arrange
        UUID rubricaId = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(rubricaId, "TV", "Televisao", false);

        when(rubricaRepository.findBySigla("TV")).thenReturn(Optional.of(rubrica));
        when(verbaRepository.findByRubricaIdAndPeriodo(rubricaId, "2025-12")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(EntidadeNaoEncontradaException.class,
                () -> handler.handle(new BuscarVerbaQuery("TV", "2025-12")));
    }
}
