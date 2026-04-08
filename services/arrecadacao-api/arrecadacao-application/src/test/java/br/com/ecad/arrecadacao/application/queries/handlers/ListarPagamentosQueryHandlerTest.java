package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.queries.ListarPagamentosQuery;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
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

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"unchecked", "null"})
class ListarPagamentosQueryHandlerTest {

    @Mock
    private PagamentoRepository pagamentoRepository;

    @InjectMocks
    private ListarPagamentosQueryHandler handler;

    @Test
    void consultarComSortFormatoCampoVirgulaDescGeraDesc() {
        var pagamento = new PageImpl<Pagamento>(List.of(), PageRequest.of(0, 10), 0);
        when(pagamentoRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(pagamento);

        var query = new ListarPagamentosQuery(0, 10, "dataRegistro,desc", null, null, null, null, null);
        var captorPageable = ArgumentCaptor.forClass(Pageable.class);

        handler.handle(query);

        verify(pagamentoRepository).findAll(any(Specification.class), captorPageable.capture());
        assertEquals(Sort.by(Sort.Direction.DESC, "dataRegistro"), captorPageable.getValue().getSort());
    }
}