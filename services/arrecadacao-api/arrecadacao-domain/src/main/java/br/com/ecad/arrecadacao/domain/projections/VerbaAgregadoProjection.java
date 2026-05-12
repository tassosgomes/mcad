package br.com.ecad.arrecadacao.domain.projections;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Projeção de verba agregada por rubrica (RF-18).
 * Soma de valorBrutoTotal e verbaLiquida de todos os períodos,
 * com contagem de períodos distintos.
 */
public interface VerbaAgregadoProjection {
    UUID getRubricaId();
    String getRubricaSigla();
    String getRubricaNome();
    BigDecimal getTotalBruto();
    BigDecimal getTotalLiquida();
    long getQuantidadePeriodos();
}
