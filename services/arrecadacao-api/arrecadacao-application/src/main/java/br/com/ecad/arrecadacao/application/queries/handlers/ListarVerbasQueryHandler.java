package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.PaginationInfo;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.VerbaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarVerbasQuery;
import br.com.ecad.arrecadacao.application.specification.VerbaSpecification;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@SuppressWarnings("null")
public class ListarVerbasQueryHandler
        implements QueryHandler<ListarVerbasQuery, PageResponse<VerbaResponse>> {

    private final VerbaRepository verbaRepository;

    public ListarVerbasQueryHandler(VerbaRepository verbaRepository) {
        this.verbaRepository = verbaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<VerbaResponse> handle(ListarVerbasQuery query) {
        var spec = VerbaSpecification.toSpec(query);
        var pageable = PageRequest.of(query.page(), query.size(), parseSort(query.sort()));
        var page = verbaRepository.findAll(spec, pageable);

        var content = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return new PageResponse<>(content, new PaginationInfo(
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()));
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "periodo");
        }
        if (sort.contains(",")) {
            String[] parts = sort.split(",", 2);
            String property = parts[0].trim();
            String direction = parts[1].trim();
            return "desc".equalsIgnoreCase(direction)
                    ? Sort.by(Sort.Direction.DESC, property)
                    : Sort.by(Sort.Direction.ASC, property);
        }
        if (sort.startsWith("-")) {
            return Sort.by(Sort.Direction.DESC, sort.substring(1));
        }
        return Sort.by(Sort.Direction.ASC, sort);
    }

    VerbaResponse toResponse(Verba verba) {
        RubricaResumoResponse rubricaResumo = buildRubricaResumo(verba.getRubrica());
        return new VerbaResponse(
                verba.getId(),
                rubricaResumo,
                verba.getPeriodo(),
                verba.getValorBrutoTotal().toPlainString(),
                verba.getDeducaoEcad().toPlainString(),
                verba.getDeducaoAssociacoes().toPlainString(),
                verba.getVerbaLiquida().toPlainString(),
                verba.getQuantidadePagamentos(),
                verba.getStatus().name(),
                verba.getAtualizadoEm()
        );
    }

    private RubricaResumoResponse buildRubricaResumo(Rubrica rubrica) {
        if (rubrica == null) return null;
        return new RubricaResumoResponse(rubrica.getId(), rubrica.getSigla(), rubrica.getNome());
    }
}
