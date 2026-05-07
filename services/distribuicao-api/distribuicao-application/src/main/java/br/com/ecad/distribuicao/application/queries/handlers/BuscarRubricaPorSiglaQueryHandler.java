package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.RubricaResponse;
import br.com.ecad.distribuicao.application.queries.BuscarRubricaPorSiglaQuery;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BuscarRubricaPorSiglaQueryHandler {

    private final RubricaRepository rubricaRepository;

    public BuscarRubricaPorSiglaQueryHandler(RubricaRepository rubricaRepository) {
        this.rubricaRepository = rubricaRepository;
    }

    @Transactional(readOnly = true)
    public RubricaResponse handle(BuscarRubricaPorSiglaQuery query) {
        return rubricaRepository.findBySigla(query.sigla())
                .map(RubricaResponse::from)
                .orElseThrow(() -> new NotFoundException(
                        "Rubrica com sigla '%s' não foi encontrada".formatted(query.sigla())));
    }
}
