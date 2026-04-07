package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;

import java.util.UUID;

public record BuscarLicencaPorIdQuery(UUID id) implements Query<LicencaResponse> {}
