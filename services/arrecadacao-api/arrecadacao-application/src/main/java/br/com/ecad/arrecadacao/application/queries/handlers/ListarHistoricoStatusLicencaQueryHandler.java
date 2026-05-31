package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusLicencaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoStatusLicencaQuery;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusLicenca;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusLicencaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.IntStream;

@Component
public class ListarHistoricoStatusLicencaQueryHandler implements QueryHandler<ListarHistoricoStatusLicencaQuery, List<HistoricoStatusLicencaResponse>> {

    private final HistoricoStatusLicencaRepository historicoRepository;
    private final ActorDisplayResolver actorDisplayResolver;

    public ListarHistoricoStatusLicencaQueryHandler(
            HistoricoStatusLicencaRepository historicoRepository,
            ActorDisplayResolver actorDisplayResolver
    ) {
        this.historicoRepository = historicoRepository;
        this.actorDisplayResolver = actorDisplayResolver;
    }

    @Override
    @Transactional(readOnly = true)
    public List<HistoricoStatusLicencaResponse> handle(ListarHistoricoStatusLicencaQuery query) {
        var historicos = historicoRepository.findByLicencaIdOrderByDataDesc(query.licencaId());
        var atores = actorDisplayResolver.resolveAll(historicos.stream()
                .map(this::toActorSnapshot)
                .toList());

        return toResponses(historicos, atores);
    }

    private List<HistoricoStatusLicencaResponse> toResponses(
            List<HistoricoStatusLicenca> historicos,
            List<ActorDisplayResponse> atores
    ) {
        return IntStream.range(0, historicos.size())
                .mapToObj(index -> toResponse(historicos.get(index), atores.get(index)))
                .toList();
    }

    private HistoricoStatusLicencaResponse toResponse(
            HistoricoStatusLicenca historico,
            ActorDisplayResponse ator
    ) {
        return new HistoricoStatusLicencaResponse(
                historico.getId(),
                historico.getStatusAnterior() != null ? historico.getStatusAnterior().name() : null,
                historico.getStatusNovo().name(),
                historico.getJustificativa(),
                historico.getAutor(),
                ator,
                historico.getData()
        );
    }

    private ActorSnapshot toActorSnapshot(HistoricoStatusLicenca historico) {
        return new ActorSnapshot(
                historico.getAtorSubject(),
                actorLabelOf(historico),
                null,
                null,
                null);
    }

    private String actorLabelOf(HistoricoStatusLicenca historico) {
        if (historico.getAutorRotulo() != null && !historico.getAutorRotulo().isBlank()) {
            return historico.getAutorRotulo();
        }
        return historico.getAutor();
    }
}
