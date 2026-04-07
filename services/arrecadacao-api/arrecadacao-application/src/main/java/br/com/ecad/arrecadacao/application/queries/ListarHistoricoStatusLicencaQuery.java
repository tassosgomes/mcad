package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusLicencaResponse;

import java.util.List;
import java.util.UUID;

public record ListarHistoricoStatusLicencaQuery(UUID licencaId)
    implements Query<List<HistoricoStatusLicencaResponse>> {}
