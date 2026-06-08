package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.AjusteEstornoPageResponse;
import br.com.ecad.distribuicao.application.dto.AjusteEstornoResumoResponse;
import br.com.ecad.distribuicao.application.dto.RubricaResumoResponse;
import br.com.ecad.distribuicao.application.queries.ListarAjustesEstornoQuery;
import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.filters.AjusteEstornoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoPage;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ListarAjustesEstornoQueryHandler {

    private final AjusteEstornoRepository ajusteEstornoRepository;
    private final RubricaRepository rubricaRepository;

    public ListarAjustesEstornoQueryHandler(
            AjusteEstornoRepository ajusteEstornoRepository,
            RubricaRepository rubricaRepository) {
        this.ajusteEstornoRepository = Objects.requireNonNull(
                ajusteEstornoRepository, "ajusteEstornoRepository must not be null");
        this.rubricaRepository = Objects.requireNonNull(
                rubricaRepository, "rubricaRepository must not be null");
    }

    @Transactional(readOnly = true)
    public AjusteEstornoPageResponse handle(ListarAjustesEstornoQuery query) {
        Objects.requireNonNull(query, "query must not be null");

        AjusteEstornoFiltro filtro = new AjusteEstornoFiltro(
                query.rubrica(),
                query.periodoOrigem(),
                query.status(),
                query.pagamentoId());

        int pageIndex = query.page() > 0 ? query.page() - 1 : 0;
        AjusteEstornoPage page = ajusteEstornoRepository.findAll(filtro, pageIndex, query.size());

        // Busca todas as rubricas únicas em uma só chamada para evitar N+1
        Map<String, RubricaResumoResponse> rubricasMap = rubricaRepository.findAll().stream()
                .collect(Collectors.toMap(
                        r -> r.getSigla(),
                        r -> new RubricaResumoResponse(r.getSigla(), r.getNome()),
                        (a, b) -> a));

        List<AjusteEstornoResumoResponse> items = page.items().stream()
                .map(ajuste -> toResumoResponse(ajuste, rubricasMap))
                .toList();

        return new AjusteEstornoPageResponse(items, page.page(), page.size(), page.totalItems(), page.totalPages());
    }

    private AjusteEstornoResumoResponse toResumoResponse(
            AjusteEstorno ajuste,
            Map<String, RubricaResumoResponse> rubricasMap) {
        RubricaResumoResponse rubrica = rubricasMap.getOrDefault(
                ajuste.getRubricaSigla(),
                new RubricaResumoResponse(ajuste.getRubricaSigla(), ajuste.getRubricaSigla()));
        return new AjusteEstornoResumoResponse(
                ajuste.getId(),
                ajuste.getEventId(),
                ajuste.getPagamentoId(),
                ajuste.getLicencaId(),
                rubrica,
                ajuste.getPeriodoOrigem(),
                ajuste.getValorEstornadoBruto(),
                ajuste.getValorAjusteLiquido(),
                ajuste.getValorAplicado(),
                ajuste.getStatus(),
                ajuste.getProcessoOrigemId(),
                ajuste.getProcessoAplicacaoId(),
                ajuste.getJustificativa(),
                ajuste.getEstornadoPor(),
                ajuste.getEstornadoEm(),
                ajuste.getRecebidoEm(),
                ajuste.getPrevistoEm(),
                ajuste.getAplicadoEm());
    }
}
