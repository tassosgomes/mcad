package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusResponse;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoStatusQuery;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.IntStream;

@Component
public class ListarHistoricoStatusQueryHandler implements QueryHandler<ListarHistoricoStatusQuery, List<HistoricoStatusResponse>> {

    private final HistoricoStatusUsuarioRepository repository;
    private final ActorDisplayResolver actorDisplayResolver;

    public ListarHistoricoStatusQueryHandler(
            HistoricoStatusUsuarioRepository repository,
            ActorDisplayResolver actorDisplayResolver
    ) {
        this.repository = repository;
        this.actorDisplayResolver = actorDisplayResolver;
    }

    @Override
    @Transactional(readOnly = true)
    public List<HistoricoStatusResponse> handle(ListarHistoricoStatusQuery query) {
        var historicos = repository.findByUsuarioMusicaIdOrderByDataDesc(query.usuarioId());
        var atores = actorDisplayResolver.resolveAll(historicos.stream()
                .map(this::toActorSnapshot)
                .toList());

        return toResponses(historicos, atores);
    }

    private List<HistoricoStatusResponse> toResponses(
            List<HistoricoStatusUsuario> historicos,
            List<ActorDisplayResponse> atores
    ) {
        return IntStream.range(0, historicos.size())
                .mapToObj(index -> toResponse(historicos.get(index), atores.get(index)))
                .toList();
    }

    private HistoricoStatusResponse toResponse(
            HistoricoStatusUsuario historico,
            ActorDisplayResponse ator
    ) {
        return new HistoricoStatusResponse(
                historico.getId(),
                historico.getStatusAnterior() != null ? historico.getStatusAnterior().name() : null,
                historico.getStatusNovo().name(),
                historico.getJustificativa(),
                historico.getAutor(),
                ator,
                historico.getData()
        );
    }

    private ActorSnapshot toActorSnapshot(HistoricoStatusUsuario historico) {
        return new ActorSnapshot(
                historico.getAtorSubject(),
                actorLabelOf(historico),
                null,
                null,
                null);
    }

    private String actorLabelOf(HistoricoStatusUsuario historico) {
        if (historico.getAutorRotulo() != null && !historico.getAutorRotulo().isBlank()) {
            return historico.getAutorRotulo();
        }
        return historico.getAutor();
    }
}
