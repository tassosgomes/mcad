package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;

import java.util.UUID;

public record BuscarRubricaPorIdQuery(UUID id) implements Query<RubricaResponse> {}
