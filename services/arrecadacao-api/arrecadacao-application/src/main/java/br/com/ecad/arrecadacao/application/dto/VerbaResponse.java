package br.com.ecad.arrecadacao.application.dto;

import java.time.Instant;
import java.util.UUID;

public record VerbaResponse(
    UUID id,
    RubricaResumoResponse rubrica,
    String periodo,
    String valorBrutoTotal,
    String deducaoEcad,
    String deducaoAssociacoes,
    String verbaLiquida,
    int quantidadePagamentos,
    String status,
    Instant atualizadoEm
) {}
