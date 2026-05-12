package br.com.ecad.arrecadacao.application.dto;

public record VerbaAgregadoResponse(
    RubricaResumoResponse rubrica,
    String valorBrutoTotal,
    String verbaLiquidaTotal,
    int quantidadePeriodos
) {}
