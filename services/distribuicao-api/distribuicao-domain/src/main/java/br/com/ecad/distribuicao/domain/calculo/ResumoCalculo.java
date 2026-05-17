package br.com.ecad.distribuicao.domain.calculo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

public record ResumoCalculo(
        BigDecimal verbaLiquida,
        int totalExecucoes,
        BigDecimal totalPontos,
        int totalObras,
        int totalCreditos,
        BigDecimal valorTotalCalculado,
        int totalCreditosRetidos,
        BigDecimal valorTotalRetido,
        Instant calculadoEm) {

    public ResumoCalculo {
        Objects.requireNonNull(verbaLiquida, "verbaLiquida must not be null");
        Objects.requireNonNull(totalPontos, "totalPontos must not be null");
        Objects.requireNonNull(valorTotalCalculado, "valorTotalCalculado must not be null");
        Objects.requireNonNull(valorTotalRetido, "valorTotalRetido must not be null");
        Objects.requireNonNull(calculadoEm, "calculadoEm must not be null");
    }
}
