package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarRubricaPorIdQuery;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BuscarRubricaPorIdQueryHandler implements QueryHandler<BuscarRubricaPorIdQuery, RubricaResponse> {

    private final RubricaRepository rubricaRepository;

    public BuscarRubricaPorIdQueryHandler(RubricaRepository rubricaRepository) {
        this.rubricaRepository = rubricaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public RubricaResponse handle(BuscarRubricaPorIdQuery query) {
        var rubrica = rubricaRepository.findById(query.id())
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                "Rubrica nao encontrada: " + query.id()));

        return new RubricaResponse(
            rubrica.getId(),
            rubrica.getSigla(),
            rubrica.getNome(),
            rubrica.isExigeClassificacao(),
            rubrica.isAtivo()
        );
    }
}
