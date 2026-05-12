package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.VerbaResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarVerbaQuery;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BuscarVerbaQueryHandler
        implements QueryHandler<BuscarVerbaQuery, VerbaResponse> {

    private final VerbaRepository verbaRepository;
    private final RubricaRepository rubricaRepository;
    private final ListarVerbasQueryHandler listarVerbasQueryHandler;

    public BuscarVerbaQueryHandler(VerbaRepository verbaRepository,
                                   RubricaRepository rubricaRepository,
                                   ListarVerbasQueryHandler listarVerbasQueryHandler) {
        this.verbaRepository = verbaRepository;
        this.rubricaRepository = rubricaRepository;
        this.listarVerbasQueryHandler = listarVerbasQueryHandler;
    }

    @Override
    @Transactional(readOnly = true)
    public VerbaResponse handle(BuscarVerbaQuery query) {
        var rubrica = rubricaRepository.findBySigla(query.rubricaSigla())
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Rubrica nao encontrada: " + query.rubricaSigla()));

        var verba = verbaRepository.findByRubricaIdAndPeriodo(rubrica.getId(), query.periodo())
                .orElseThrow(() -> new EntidadeNaoEncontradaException(
                        "Verba nao encontrada para rubrica %s e periodo %s"
                                .formatted(query.rubricaSigla(), query.periodo())));

        return listarVerbasQueryHandler.toResponse(verba);
    }
}
