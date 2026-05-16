package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.application.queries.BuscarProcessoPorIdQuery;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BuscarProcessoPorIdQueryHandler {

    private final ProcessoRepository processoRepository;

    public BuscarProcessoPorIdQueryHandler(ProcessoRepository processoRepository) {
        this.processoRepository = processoRepository;
    }

    @Transactional(readOnly = true)
    public ProcessoResponse handle(BuscarProcessoPorIdQuery query) {
        return processoRepository.findById(query.id())
                .map(ProcessoResponse::from)
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuição não encontrado: " + query.id()));
    }
}
