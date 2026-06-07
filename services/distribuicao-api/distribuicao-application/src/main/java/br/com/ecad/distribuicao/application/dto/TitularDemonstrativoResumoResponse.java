package br.com.ecad.distribuicao.application.dto;

import java.util.UUID;

public record TitularDemonstrativoResumoResponse(
    UUID titularId,
    String titularNome,
    String totalCalculado,
    String totalRetido,
    String totalLiberado,
    String totalAReceber,
    int quantidadeObras
) {}
