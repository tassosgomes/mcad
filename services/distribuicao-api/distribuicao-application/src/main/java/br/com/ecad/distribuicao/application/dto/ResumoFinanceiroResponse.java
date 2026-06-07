package br.com.ecad.distribuicao.application.dto;

public record ResumoFinanceiroResponse(
    String totalAReceber,
    String totalCalculado,
    String totalRetido,
    String totalLiberado,
    String totalAjustesEstorno
) {}
