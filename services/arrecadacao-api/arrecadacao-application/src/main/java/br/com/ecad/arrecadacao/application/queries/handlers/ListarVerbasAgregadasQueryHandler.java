package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.VerbaAgregadoResponse;
import br.com.ecad.arrecadacao.application.queries.ListarVerbasAgregadasQuery;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoFiltro;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoProjection;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class ListarVerbasAgregadasQueryHandler
        implements QueryHandler<ListarVerbasAgregadasQuery, List<VerbaAgregadoResponse>> {

    private final VerbaRepository verbaRepository;

    public ListarVerbasAgregadasQueryHandler(VerbaRepository verbaRepository) {
        this.verbaRepository = verbaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<VerbaAgregadoResponse> handle(ListarVerbasAgregadasQuery query) {
        var filtro = new VerbaAgregadoFiltro(null, query.periodoInicio(), query.periodoFim());
        return verbaRepository.findAgregadoPorRubrica(filtro).stream()
                .map(this::toResponse)
                .toList();
    }

    VerbaAgregadoResponse toResponse(VerbaAgregadoProjection projection) {
        var rubrica = new RubricaResumoResponse(
                projection.getRubricaId(),
                projection.getRubricaSigla(),
                projection.getRubricaNome()
        );
        return new VerbaAgregadoResponse(
                rubrica,
                projection.getTotalBruto().toPlainString(),
                projection.getTotalLiquida().toPlainString(),
                (int) projection.getQuantidadePeriodos()
        );
    }
}
