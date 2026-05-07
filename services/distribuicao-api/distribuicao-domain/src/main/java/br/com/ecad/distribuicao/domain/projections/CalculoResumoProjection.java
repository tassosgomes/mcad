package br.com.ecad.distribuicao.domain.projections;

import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CalculoResumoProjection(
        UUID processoId,
        StatusProcesso status,
        String rubricaSigla,
        String periodo,
        BigDecimal verbaLiquida,
        Integer totalExecucoes,
        Integer totalObras,
        BigDecimal totalPontos,
        Integer totalCreditos,
        BigDecimal valorTotalCalculado,
        Instant calculadoEm) {
}
