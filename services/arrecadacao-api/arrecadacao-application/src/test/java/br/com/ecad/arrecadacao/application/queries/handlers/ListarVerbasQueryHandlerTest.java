package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.queries.ListarVerbasQuery;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"unchecked", "null"})
class ListarVerbasQueryHandlerTest {

    @Mock
    private VerbaRepository verbaRepository;

    @InjectMocks
    private ListarVerbasQueryHandler handler;

    @Test
    void listar_SemFiltros_UsaSortDefaultPeriodoDesc() {
        // Arrange
        var page = new PageImpl<Verba>(List.of(), PageRequest.of(0, 20), 0);
        when(verbaRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        var query = new ListarVerbasQuery(null, null, null, null, null, 0, 20, "-periodo");
        var captorPageable = ArgumentCaptor.forClass(Pageable.class);

        // Act
        handler.handle(query);

        // Assert
        verify(verbaRepository).findAll(any(Specification.class), captorPageable.capture());
        assertEquals(Sort.by(Sort.Direction.DESC, "periodo"), captorPageable.getValue().getSort());
    }

    @Test
    void listar_ComSortPrefixoNegativo_UsaSortDesc() {
        // Arrange
        var page = new PageImpl<Verba>(List.of(), PageRequest.of(0, 20), 0);
        when(verbaRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        var query = new ListarVerbasQuery(null, null, null, null, null, 0, 20, "-atualizadoEm");
        var captorPageable = ArgumentCaptor.forClass(Pageable.class);

        // Act
        handler.handle(query);

        // Assert
        verify(verbaRepository).findAll(any(Specification.class), captorPageable.capture());
        assertEquals(Sort.by(Sort.Direction.DESC, "atualizadoEm"), captorPageable.getValue().getSort());
    }

    @Test
    void listar_ComSortFormatoCampoVirgulaDesc_UsaSortDesc() {
        // Arrange
        var page = new PageImpl<Verba>(List.of(), PageRequest.of(0, 10), 0);
        when(verbaRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        var query = new ListarVerbasQuery(null, null, null, null, null, 0, 10, "periodo,desc");
        var captorPageable = ArgumentCaptor.forClass(Pageable.class);

        // Act
        handler.handle(query);

        // Assert
        verify(verbaRepository).findAll(any(Specification.class), captorPageable.capture());
        assertEquals(Sort.by(Sort.Direction.DESC, "periodo"), captorPageable.getValue().getSort());
    }

    @Test
    void listar_ComSortSemPrefixo_UsaSortAsc() {
        // Arrange
        var page = new PageImpl<Verba>(List.of(), PageRequest.of(0, 20), 0);
        when(verbaRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        var query = new ListarVerbasQuery(null, null, null, null, null, 0, 20, "periodo");
        var captorPageable = ArgumentCaptor.forClass(Pageable.class);

        // Act
        handler.handle(query);

        // Assert
        verify(verbaRepository).findAll(any(Specification.class), captorPageable.capture());
        assertEquals(Sort.by(Sort.Direction.ASC, "periodo"), captorPageable.getValue().getSort());
    }

    @Test
    void listar_ComFiltrosPreenchidos_ChamandoRepositorioComSpec() {
        // Arrange
        var page = new PageImpl<Verba>(List.of(), PageRequest.of(0, 20), 0);
        when(verbaRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        var query = new ListarVerbasQuery("RADIO", "2026-04", null, null, StatusVerba.ABERTA, 0, 20, "-periodo");

        // Act
        var response = handler.handle(query);

        // Assert
        assertNotNull(response);
        verify(verbaRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listar_ComVerbaNoResultado_MapeiaDtoCorretamente() {
        // Arrange
        UUID rubricaId = UUID.randomUUID();
        Rubrica rubrica = mock(Rubrica.class);
        when(rubrica.getId()).thenReturn(rubricaId);
        when(rubrica.getSigla()).thenReturn("RADIO");
        when(rubrica.getNome()).thenReturn("Radio AM/FM");

        // Simula verba com rubrica carregada via mock
        Verba verbaMock = mock(Verba.class);
        when(verbaMock.getId()).thenReturn(UUID.randomUUID());
        when(verbaMock.getRubrica()).thenReturn(rubrica);
        when(verbaMock.getPeriodo()).thenReturn("2026-04");
        when(verbaMock.getValorBrutoTotal()).thenReturn(new BigDecimal("1073.10"));
        when(verbaMock.getDeducaoEcad()).thenReturn(new BigDecimal("107.31"));
        when(verbaMock.getDeducaoAssociacoes()).thenReturn(new BigDecimal("53.66"));
        when(verbaMock.getVerbaLiquida()).thenReturn(new BigDecimal("912.13"));
        when(verbaMock.getQuantidadePagamentos()).thenReturn(3);
        when(verbaMock.getStatus()).thenReturn(StatusVerba.ABERTA);
        when(verbaMock.getAtualizadoEm()).thenReturn(Instant.now());

        var pageMock = new PageImpl<>(List.of(verbaMock), PageRequest.of(0, 20), 1);
        when(verbaRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(pageMock);

        var query = new ListarVerbasQuery(null, null, null, null, null, 0, 20, "-periodo");

        // Act
        var response = handler.handle(query);

        // Assert
        assertEquals(1, response.items().size());
        var dto = response.items().get(0);
        assertEquals("RADIO", dto.rubrica().sigla());
        assertEquals("1073.10", dto.valorBrutoTotal());
        assertEquals("107.31", dto.deducaoEcad());
        assertEquals("53.66", dto.deducaoAssociacoes());
        assertEquals("912.13", dto.verbaLiquida());
        assertEquals(3, dto.quantidadePagamentos());
        assertEquals("ABERTA", dto.status());
        assertEquals("2026-04", dto.periodo());
    }
}
