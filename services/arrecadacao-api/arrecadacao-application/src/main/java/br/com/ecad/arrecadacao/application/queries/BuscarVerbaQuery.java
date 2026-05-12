package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.VerbaResponse;

public record BuscarVerbaQuery(
    String rubricaSigla,
    String periodo
) implements Query<VerbaResponse> {}
