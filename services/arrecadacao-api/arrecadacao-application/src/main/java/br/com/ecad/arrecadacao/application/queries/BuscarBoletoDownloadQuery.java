package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.BoletoDownloadResponse;

import java.util.UUID;

public record BuscarBoletoDownloadQuery(UUID pagamentoId) implements Query<BoletoDownloadResponse> {}
