package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.CalculoProcessoResponse;
import br.com.ecad.distribuicao.application.queries.ConsultarCalculoProcessoQuery;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import java.util.Locale;
import java.util.Objects;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ConsultarCalculoProcessoQueryHandler {

    private static final int MAX_PAGE_SIZE = 100;

    private final CreditoRepository creditoRepository;

    public ConsultarCalculoProcessoQueryHandler(CreditoRepository creditoRepository) {
        this.creditoRepository = Objects.requireNonNull(creditoRepository, "creditoRepository must not be null");
    }

    @Transactional(readOnly = true)
    public CalculoProcessoResponse handle(ConsultarCalculoProcessoQuery query) {
        Objects.requireNonNull(query, "query must not be null");
        validatePagination(query.page(), query.size());
        CategoriaCredito categoria = parseCategoria(query.categoria());

        CalculoResumoProjection resumo = creditoRepository.buscarResumo(query.processoId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuição não encontrado: " + query.processoId()));
        CreditoFiltro filtro = new CreditoFiltro(
                query.processoId(),
                categoria,
                query.titularId(),
                query.obraId());

        return CalculoProcessoResponse.from(
                resumo,
                creditoRepository.findByProcessoId(filtro, PageRequest.of(query.page(), query.size())));
    }

    private void validatePagination(int page, int size) {
        if (page < 0) {
            throw new PreRequisitosException("Parâmetro page deve ser maior ou igual a 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new PreRequisitosException("Parâmetro size deve estar entre 1 e " + MAX_PAGE_SIZE);
        }
    }

    private CategoriaCredito parseCategoria(String categoria) {
        if (categoria == null || categoria.isBlank()) {
            return null;
        }

        try {
            return CategoriaCredito.valueOf(categoria.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new PreRequisitosException("Categoria de crédito inválida: " + categoria);
        }
    }
}
