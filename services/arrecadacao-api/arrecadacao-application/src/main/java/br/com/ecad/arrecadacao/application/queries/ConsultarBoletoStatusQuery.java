package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.BoletoStatusResponse;

import java.util.UUID;

public record ConsultarBoletoStatusQuery(UUID pagamentoId) implements Query<BoletoStatusResponse> {}
