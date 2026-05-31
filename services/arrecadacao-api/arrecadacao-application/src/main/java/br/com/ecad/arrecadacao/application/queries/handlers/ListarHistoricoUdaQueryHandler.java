package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoUdaQuery;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.IntStream;

@Component
public class ListarHistoricoUdaQueryHandler
        implements QueryHandler<ListarHistoricoUdaQuery, List<UdaResponse>> {

    private final UdaValorRepository udaValorRepository;
    private final ActorDisplayResolver actorDisplayResolver;

    public ListarHistoricoUdaQueryHandler(
            UdaValorRepository udaValorRepository,
            ActorDisplayResolver actorDisplayResolver
    ) {
        this.udaValorRepository = udaValorRepository;
        this.actorDisplayResolver = actorDisplayResolver;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UdaResponse> handle(ListarHistoricoUdaQuery query) {
        var udas = udaValorRepository.findAllOrderByDataVigenciaDesc();
        var atores = actorDisplayResolver.resolveAll(udas.stream()
                .map(this::toActorSnapshot)
                .toList());

        return IntStream.range(0, udas.size())
            .mapToObj(index -> toResponse(udas.get(index), atores.get(index)))
            .toList();
    }

    private UdaResponse toResponse(UdaValor uda, ActorDisplayResponse criadoPorAtor) {
        return new UdaResponse(
                uda.getId(),
                uda.getValor().toPlainString(),
                uda.getDataVigencia(),
                uda.getCriadoEm(),
                uda.getCriadoPor(),
                criadoPorAtor);
    }

    private ActorSnapshot toActorSnapshot(UdaValor uda) {
        return new ActorSnapshot(
                uda.getCriadoPorSubject(),
                actorLabelOf(uda),
                null,
                null,
                null);
    }

    private String actorLabelOf(UdaValor uda) {
        if (uda.getCriadoPorRotulo() != null && !uda.getCriadoPorRotulo().isBlank()) {
            return uda.getCriadoPorRotulo();
        }
        return uda.getCriadoPor();
    }
}
