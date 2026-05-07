package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.RubricaResponse;
import br.com.ecad.distribuicao.application.queries.ListarRubricasQuery;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ListarRubricasQueryHandler {

    private final RubricaRepository rubricaRepository;

    public ListarRubricasQueryHandler(RubricaRepository rubricaRepository) {
        this.rubricaRepository = rubricaRepository;
    }

    @Transactional(readOnly = true)
    public List<RubricaResponse> handle(ListarRubricasQuery query) {
        return rubricaRepository.findAll().stream()
                .map(RubricaResponse::from)
                .toList();
    }
}
