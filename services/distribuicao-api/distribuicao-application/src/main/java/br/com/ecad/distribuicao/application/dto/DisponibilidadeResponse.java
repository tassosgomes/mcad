package br.com.ecad.distribuicao.application.dto;

import java.math.BigDecimal;

public record DisponibilidadeResponse(
        String rubricaSigla,
        String periodo,
        BigDecimal verbaLiquida,
        int totalExecucoes) {
}
