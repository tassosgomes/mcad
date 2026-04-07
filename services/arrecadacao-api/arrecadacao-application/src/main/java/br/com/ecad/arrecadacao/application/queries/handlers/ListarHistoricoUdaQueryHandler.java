package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoUdaQuery;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class ListarHistoricoUdaQueryHandler
        implements QueryHandler<ListarHistoricoUdaQuery, List<UdaResponse>> {

    private final UdaValorRepository udaValorRepository;

    public ListarHistoricoUdaQueryHandler(UdaValorRepository udaValorRepository) {
        this.udaValorRepository = udaValorRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UdaResponse> handle(ListarHistoricoUdaQuery query) {
        return udaValorRepository.findAllOrderByDataVigenciaDesc().stream()
            .map(uda -> new UdaResponse(
                uda.getId(),
                uda.getValor().toPlainString(),
                uda.getDataVigencia(),
                uda.getCriadoEm(),
                uda.getCriadoPor()))
            .toList();
    }
}
