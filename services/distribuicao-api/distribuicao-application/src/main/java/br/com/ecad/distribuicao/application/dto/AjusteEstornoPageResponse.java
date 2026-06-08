package br.com.ecad.distribuicao.application.dto;

import java.util.List;

public record AjusteEstornoPageResponse(
        List<AjusteEstornoResumoResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages) {
}
