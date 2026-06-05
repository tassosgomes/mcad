package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.DashboardResumoResponse;
import br.com.ecad.arrecadacao.application.dto.DashboardResumoResponse.DashboardAlerta;
import br.com.ecad.arrecadacao.application.queries.GetDashboardResumoQuery;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoFiltro;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Handler que agrega métricas de licenças e verbas para o widget
 * de Arrecadação na dashboard.
 */
@Component
public class GetDashboardResumoQueryHandler
        implements QueryHandler<GetDashboardResumoQuery, DashboardResumoResponse> {

    private final LicencaRepository licencaRepository;
    private final VerbaRepository verbaRepository;

    public GetDashboardResumoQueryHandler(
            LicencaRepository licencaRepository,
            VerbaRepository verbaRepository) {
        this.licencaRepository = licencaRepository;
        this.verbaRepository = verbaRepository;
    }

    @Override
    public DashboardResumoResponse handle(GetDashboardResumoQuery query) {
        // Contar licenças ativas
        var ativasSpec = statusSpec(StatusLicenca.ATIVA);
        var ativasPage = licencaRepository.findAll(ativasSpec, PageRequest.of(0, 1));
        long totalAtivas = ativasPage.getTotalElements();

        // Contar licenças suspensas
        var suspensasSpec = statusSpec(StatusLicenca.SUSPENSA);
        var suspensasPage = licencaRepository.findAll(suspensasSpec, PageRequest.of(0, 1));
        long totalSuspensas = suspensasPage.getTotalElements();

        // Buscar verbas do mês corrente para calcular arrecadação
        var periodoAtual = YearMonth.now().toString(); // "YYYY-MM"
        var filtro = new VerbaAgregadoFiltro(periodoAtual, periodoAtual, null);
        var agregados = verbaRepository.findAgregadoPorRubrica(filtro);

        BigDecimal arrecadacaoMes = BigDecimal.ZERO;
        BigDecimal verbaLiquida = BigDecimal.ZERO;

        for (var agregado : agregados) {
            arrecadacaoMes = arrecadacaoMes.add(agregado.getTotalBruto());
            verbaLiquida = verbaLiquida.add(agregado.getTotalLiquida());
        }

        List<DashboardAlerta> alertas = new ArrayList<>();

        return new DashboardResumoResponse(
                arrecadacaoMes,
                totalAtivas,
                totalSuspensas,
                verbaLiquida,
                alertas);
    }

    @SuppressWarnings("unchecked")
    private static Specification<br.com.ecad.arrecadacao.domain.entities.Licenca> statusSpec(StatusLicenca status) {
        return (root, cq, cb) -> cb.equal(root.get("status"), status);
    }
}
