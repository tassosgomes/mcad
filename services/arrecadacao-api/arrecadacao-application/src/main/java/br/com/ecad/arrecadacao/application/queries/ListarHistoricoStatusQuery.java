package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusResponse;
import java.util.List;
import java.util.UUID;

public record ListarHistoricoStatusQuery(
    UUID usuarioId
) implements Query<List<HistoricoStatusResponse>> {}
