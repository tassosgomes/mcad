package br.com.ecad.distribuicao.application.dto;

import java.util.List;

public record TitularesDemonstrativoPageResponse(
    List<TitularDemonstrativoResumoResponse> items,
    CalculoProcessoResponse.PaginationMetadata metadata
) {}
