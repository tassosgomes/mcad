package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;

import java.util.List;

public record ListarHistoricoUdaQuery() implements Query<List<UdaResponse>> {}
