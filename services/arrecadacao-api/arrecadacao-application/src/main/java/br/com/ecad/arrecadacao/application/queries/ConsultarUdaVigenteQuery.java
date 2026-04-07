package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;

public record ConsultarUdaVigenteQuery() implements Query<UdaResponse> {}
