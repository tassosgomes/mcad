package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.DashboardResumoResponse;

/**
 * Query para obter o resumo da dashboard do domínio de Arrecadação.
 */
public record GetDashboardResumoQuery() implements Query<DashboardResumoResponse> {}
