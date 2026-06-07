package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.CalculoProcessoResponse;
import br.com.ecad.distribuicao.application.dto.TitularDemonstrativoResumoResponse;
import br.com.ecad.distribuicao.application.dto.TitularesDemonstrativoPageResponse;
import br.com.ecad.distribuicao.application.queries.ListarTitularesDemonstrativoQuery;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.projections.TitularDemonstrativoProjection;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handler para listagem paginada de titulares com creditos em um processo.
 *
 * <p>Ordenacao por {@code totalAReceber} e feita na pagina retornada (nao e global).
 * Processos com muitos titulares terao a ordenacao correta apenas dentro da pagina.</p>
 */
@Component
public class ListarTitularesDemonstrativoQueryHandler {

    private static final Logger log = LoggerFactory.getLogger(ListarTitularesDemonstrativoQueryHandler.class);
    private static final int MAX_PAGE_SIZE = 100;

    private final ProcessoRepository processoRepository;
    private final CreditoRepository creditoRepository;

    public ListarTitularesDemonstrativoQueryHandler(
            ProcessoRepository processoRepository,
            CreditoRepository creditoRepository) {
        this.processoRepository = Objects.requireNonNull(processoRepository, "processoRepository must not be null");
        this.creditoRepository = Objects.requireNonNull(creditoRepository, "creditoRepository must not be null");
    }

    @Transactional(readOnly = true)
    public TitularesDemonstrativoPageResponse handle(ListarTitularesDemonstrativoQuery query) {
        Objects.requireNonNull(query, "query must not be null");
        validatePagination(query.page(), query.size());

        var processo = processoRepository.findById(query.processoId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuicao nao encontrado: " + query.processoId()));

        if (processo.getStatus() != StatusProcesso.FINALIZADO) {
            log.debug("Listando demonstrativo de processo nao finalizado: {}", query.processoId());
        }

        var pageable = PageRequest.of(query.page(), query.size());
        List<TitularDemonstrativoProjection> projections =
                creditoRepository.findTitularesByProcessoId(
                        query.processoId(), query.titularNome(), pageable);
        long total = creditoRepository.countTitularesByProcessoId(
                query.processoId(), query.titularNome());

        Map<UUID, BigDecimal> liberadosMap =
                creditoRepository.sumLiberadosByProcessoLiberacaoId(query.processoId());

        List<TitularDemonstrativoResumoResponse> items = projections.stream()
                .map(p -> toResumo(p, liberadosMap.getOrDefault(p.titularId(), BigDecimal.ZERO)))
                .toList();

        if ("totalAReceber".equals(query.sort())) {
            items = items.stream()
                    .sorted(Comparator.comparing(
                            r -> new BigDecimal(r.totalAReceber()), Comparator.reverseOrder()))
                    .toList();
        }

        int totalPages = (int) Math.ceil((double) total / query.size());
        var metadata = new CalculoProcessoResponse.PaginationMetadata(
                query.page(), query.size(), total, totalPages);

        return new TitularesDemonstrativoPageResponse(items, metadata);
    }

    private TitularDemonstrativoResumoResponse toResumo(
            TitularDemonstrativoProjection p, BigDecimal totalLiberado) {
        BigDecimal totalAReceber = p.totalCalculado().add(totalLiberado);
        return new TitularDemonstrativoResumoResponse(
                p.titularId(),
                p.titularNome(),
                format2(p.totalCalculado()),
                format2(p.totalRetido()),
                format2(totalLiberado),
                format2(totalAReceber),
                (int) p.quantidadeObras()
        );
    }

    private static String format2(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private void validatePagination(int page, int size) {
        if (page < 0) {
            throw new PreRequisitosException("Parametro page deve ser maior ou igual a 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new PreRequisitosException("Parametro size deve estar entre 1 e " + MAX_PAGE_SIZE);
        }
    }
}
