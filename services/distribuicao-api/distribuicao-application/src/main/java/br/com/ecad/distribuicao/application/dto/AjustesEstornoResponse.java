package br.com.ecad.distribuicao.application.dto;

import java.math.BigDecimal;
import java.util.List;

public record AjustesEstornoResponse(
        List<AjusteEstornoCalculoItemResponse> items,
        int total,
        BigDecimal valorTotal) {

    public static AjustesEstornoResponse empty() {
        return new AjustesEstornoResponse(List.of(), 0, BigDecimal.ZERO);
    }
}
