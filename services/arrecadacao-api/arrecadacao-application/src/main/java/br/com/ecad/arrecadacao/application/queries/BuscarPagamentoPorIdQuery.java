package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;

import java.util.UUID;

public record BuscarPagamentoPorIdQuery(UUID id) implements Query<PagamentoResponse> {}
