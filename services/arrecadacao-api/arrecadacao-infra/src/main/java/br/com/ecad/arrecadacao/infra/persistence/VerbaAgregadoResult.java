package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoProjection;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Implementação concreta de VerbaAgregadoProjection usada como resultado
 * da query JPQL de agregação por rubrica (RF-18).
 *
 * <p>Record utilizado na cláusula {@code new} do JPQL para receber os
 * dados agregados diretamente da query, evitando mapeamento manual.</p>
 */
public record VerbaAgregadoResult(
        UUID rubricaId,
        String rubricaSigla,
        String rubricaNome,
        BigDecimal totalBruto,
        BigDecimal totalLiquida,
        long quantidadePeriodos
) implements VerbaAgregadoProjection {

    @Override public UUID getRubricaId()           { return rubricaId; }
    @Override public String getRubricaSigla()       { return rubricaSigla; }
    @Override public String getRubricaNome()        { return rubricaNome; }
    @Override public BigDecimal getTotalBruto()     { return totalBruto; }
    @Override public BigDecimal getTotalLiquida()   { return totalLiquida; }
    @Override public long getQuantidadePeriodos()   { return quantidadePeriodos; }
}
