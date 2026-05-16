package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.application.queries.ListarProcessosQuery;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository.ProcessoPage;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ListarProcessosQueryHandler {

    private final ProcessoRepository processoRepository;

    public ListarProcessosQueryHandler(ProcessoRepository processoRepository) {
        this.processoRepository = processoRepository;
    }

    @Transactional(readOnly = true)
    public ProcessoPageResponse handle(ListarProcessosQuery query) {
        ProcessoPage page = processoRepository.findAll(
                query.rubricaSigla(),
                query.periodo(),
                query.status(),
                query.page(),
                query.size());

        List<ProcessoResponse> items = page.content().stream()
                .map(ProcessoResponse::from)
                .toList();

        return new ProcessoPageResponse(items, page.totalElements(), page.totalPages());
    }

    public record ProcessoPageResponse(
            List<ProcessoResponse> items,
            long totalElements,
            int totalPages) {
    }
}
