package br.com.ecad.distribuicao.infra.events;

import java.math.BigDecimal;

/**
 * Payload do CloudEvent para o evento {@code arrecadacao.verba.disponivel}.
 */
public record VerbaEventPayload(
        String rubricaSigla,
        String periodo,
        BigDecimal valorBruto,
        BigDecimal deducaoEcad,
        BigDecimal deducaoAssociacoes,
        BigDecimal verbaLiquida) {
}
