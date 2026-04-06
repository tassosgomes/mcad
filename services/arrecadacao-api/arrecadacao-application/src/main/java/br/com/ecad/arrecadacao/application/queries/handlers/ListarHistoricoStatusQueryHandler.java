package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusResponse;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoStatusQuery;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ListarHistoricoStatusQueryHandler implements QueryHandler<ListarHistoricoStatusQuery, List<HistoricoStatusResponse>> {

    private final HistoricoStatusUsuarioRepository repository;

    public ListarHistoricoStatusQueryHandler(HistoricoStatusUsuarioRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<HistoricoStatusResponse> handle(ListarHistoricoStatusQuery query) {
        return repository.findByUsuarioMusicaIdOrderByDataDesc(query.usuarioId())
                .stream()
                .map(entity -> new HistoricoStatusResponse(
                        entity.getId(),
                        entity.getStatusAnterior() != null ? entity.getStatusAnterior().name() : null,
                        entity.getStatusNovo().name(),
                        entity.getJustificativa(),
                        entity.getAutor(),
                        entity.getData()
                ))
                .collect(Collectors.toList());
    }
}
