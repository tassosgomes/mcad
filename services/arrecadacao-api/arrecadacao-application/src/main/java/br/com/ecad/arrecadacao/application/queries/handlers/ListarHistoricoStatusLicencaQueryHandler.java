package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusLicencaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoStatusLicencaQuery;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusLicencaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class ListarHistoricoStatusLicencaQueryHandler implements QueryHandler<ListarHistoricoStatusLicencaQuery, List<HistoricoStatusLicencaResponse>> {

    private final HistoricoStatusLicencaRepository historicoRepository;

    public ListarHistoricoStatusLicencaQueryHandler(HistoricoStatusLicencaRepository historicoRepository) {
        this.historicoRepository = historicoRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<HistoricoStatusLicencaResponse> handle(ListarHistoricoStatusLicencaQuery query) {
        var historicos = historicoRepository.findByLicencaIdOrderByDataDesc(query.licencaId());

        return historicos.stream()
                .map(h -> new HistoricoStatusLicencaResponse(
                        h.getId(),
                        h.getStatusAnterior() != null ? h.getStatusAnterior().name() : null,
                        h.getStatusNovo().name(),
                        h.getJustificativa(),
                        h.getAutor(),
                        h.getData()
                ))
                .toList();
    }
}
