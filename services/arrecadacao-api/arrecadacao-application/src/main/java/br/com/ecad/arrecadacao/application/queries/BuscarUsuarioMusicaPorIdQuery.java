package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import java.util.UUID;

public record BuscarUsuarioMusicaPorIdQuery(
    UUID id
) implements Query<UsuarioMusicaResponse> {}
