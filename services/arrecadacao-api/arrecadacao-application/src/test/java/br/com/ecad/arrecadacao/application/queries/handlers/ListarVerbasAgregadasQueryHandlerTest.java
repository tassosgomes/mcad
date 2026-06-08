package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.queries.ListarVerbasAgregadasQuery;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoFiltro;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoProjection;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListarVerbasAgregadasQueryHandlerTest {

    @Mock
    private VerbaRepository verbaRepository;

    @InjectMocks
    private ListarVerbasAgregadasQueryHandler handler;

    @Test
    void listarAgregadas_SemFiltros_PassaFiltroVazioParaRepositorio() {
        // Arrange
        when(verbaRepository.findAgregadoPorRubrica(any())).thenReturn(List.of());
        var query = new ListarVerbasAgregadasQuery(null, null, null);
        var captorFiltro = ArgumentCaptor.forClass(VerbaAgregadoFiltro.class);

        // Act
        var result = handler.handle(query);

        // Assert
        verify(verbaRepository).findAgregadoPorRubrica(captorFiltro.capture());
        assertNull(captorFiltro.getValue().periodoInicio());
        assertNull(captorFiltro.getValue().periodoFim());
        assertTrue(result.isEmpty());
    }

    @Test
    void listarAgregadas_ComPeriodoFiltro_PassaFiltroCorretoParaRepositorio() {
        // Arrange
        when(verbaRepository.findAgregadoPorRubrica(any())).thenReturn(List.of());
        var query = new ListarVerbasAgregadasQuery("2026-01", "2026-06", null);
        var captorFiltro = ArgumentCaptor.forClass(VerbaAgregadoFiltro.class);

        // Act
        handler.handle(query);

        // Assert
        verify(verbaRepository).findAgregadoPorRubrica(captorFiltro.capture());
        assertEquals("2026-01", captorFiltro.getValue().periodoInicio());
        assertEquals("2026-06", captorFiltro.getValue().periodoFim());
    }

    @Test
    void listarAgregadas_ComUmaRubrica_MapeiaDtoCorretamente() {
        // Arrange
        UUID rubricaId = UUID.randomUUID();
        VerbaAgregadoProjection projection = buildProjection(rubricaId, "RADIO", "Radio AM/FM",
                new BigDecimal("3073.10"), new BigDecimal("2612.14"), 2);

        when(verbaRepository.findAgregadoPorRubrica(any())).thenReturn(List.of(projection));
        var query = new ListarVerbasAgregadasQuery(null, null, null);

        // Act
        var result = handler.handle(query);

        // Assert
        assertEquals(1, result.size());
        var dto = result.get(0);
        assertEquals(rubricaId, dto.rubrica().id());
        assertEquals("RADIO", dto.rubrica().sigla());
        assertEquals("Radio AM/FM", dto.rubrica().nome());
        assertEquals("3073.10", dto.valorBrutoTotal());
        assertEquals("2612.14", dto.verbaLiquidaTotal());
        assertEquals(2, dto.quantidadePeriodos());
    }

    @Test
    void listarAgregadas_ComStatusFiltro_IgnoraStatusNoFiltroDeRepositorio() {
        // Arrange — o filtro de status não é suportado pelo repositório agregado;
        // a query aceita o parâmetro mas não o repassa (design: fora do escopo do RF-18)
        when(verbaRepository.findAgregadoPorRubrica(any())).thenReturn(List.of());
        var query = new ListarVerbasAgregadasQuery(null, null, StatusVerba.ABERTA);

        // Act
        handler.handle(query);

        // Assert — repositório é chamado uma vez com filtro sem status
        verify(verbaRepository, times(1)).findAgregadoPorRubrica(any());
    }

    private VerbaAgregadoProjection buildProjection(UUID rubricaId, String sigla, String nome,
                                                     BigDecimal totalBruto, BigDecimal totalLiquida,
                                                     long quantidadePeriodos) {
        return new VerbaAgregadoProjection() {
            @Override public UUID getRubricaId()          { return rubricaId; }
            @Override public String getRubricaSigla()     { return sigla; }
            @Override public String getRubricaNome()      { return nome; }
            @Override public boolean isRubricaAtivo()    { return true; }
            @Override public BigDecimal getTotalBruto()   { return totalBruto; }
            @Override public BigDecimal getTotalLiquida() { return totalLiquida; }
            @Override public long getQuantidadePeriodos() { return quantidadePeriodos; }
        };
    }
}
