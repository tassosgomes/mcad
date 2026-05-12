package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.VerbaResponse;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;

public record ListarVerbasQuery(
    String rubricaSigla,
    String periodo,
    String periodoInicio,
    String periodoFim,
    StatusVerba status,
    int page,
    int size,
    String sort
) implements Query<PageResponse<VerbaResponse>> {}
