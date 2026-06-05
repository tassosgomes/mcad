package br.com.ecad.distribuicao.application.queries.handlers;

import br.com.ecad.distribuicao.application.dto.DashboardResumoResponse;
import br.com.ecad.distribuicao.application.dto.DashboardResumoResponse.DashboardAlerta;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handler que agrega métricas de distribuição para o widget da dashboard.
 * - Status do último ciclo finalizado
 * - Total repassado e créditos retidos do último processo
 * - Contagem de rubricas ativas
 */
@Component
public class GetDashboardResumoQueryHandler {

    private final ProcessoRepository processoRepository;
    private final RubricaRepository rubricaRepository;
    private final CreditoRepository creditoRepository;

    public GetDashboardResumoQueryHandler(
            ProcessoRepository processoRepository,
            RubricaRepository rubricaRepository,
            CreditoRepository creditoRepository) {
        this.processoRepository = processoRepository;
        this.rubricaRepository = rubricaRepository;
        this.creditoRepository = creditoRepository;
    }

    @Transactional(readOnly = true)
    public DashboardResumoResponse handle() {
        // Contagem de rubricas ativas
        var rubricas = rubricaRepository.findAll();
        int rubricasAtivas = rubricas.size();

        // Buscar último processo finalizado
        var processos = processoRepository.findAtivos();
        var ultimoFinalizado = processos.stream()
                .filter(p -> p.getStatus() == StatusProcesso.FINALIZADO)
                .max(Comparator.comparing(p -> p.getFinalizadoEm() != null ? p.getFinalizadoEm() : p.getCriadoEm()))
                .orElse(null);

        String statusUltimoCiclo = "Sem processos";
        BigDecimal totalRepassado = BigDecimal.ZERO;
        BigDecimal creditosRetidos = BigDecimal.ZERO;

        if (ultimoFinalizado != null) {
            statusUltimoCiclo = ultimoFinalizado.getStatus().name();
            var resumo = creditoRepository.buscarResumo(ultimoFinalizado.getId());
            if (resumo.isPresent()) {
                totalRepassado = resumo.get().valorTotalCalculado();
                creditosRetidos = resumo.get().valorTotalRetido();
            }
        }

        List<DashboardAlerta> alertas = new ArrayList<>();

        return new DashboardResumoResponse(
                statusUltimoCiclo,
                totalRepassado,
                creditosRetidos,
                rubricasAtivas,
                alertas);
    }
}
