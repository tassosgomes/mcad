package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.VerbaAgregadoResponse;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;

import java.util.List;

public record ListarVerbasAgregadasQuery(
    String periodoInicio,
    String periodoFim,
    StatusVerba status
) implements Query<List<VerbaAgregadoResponse>> {}
