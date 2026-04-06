package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;

public record ListarUsuariosMusicaQuery(
    String razaoSocial,
    String cnpj,
    StatusUsuarioMusica status,
    String cidade,
    int page,
    int size,
    String sort
) implements Query<PageResponse<UsuarioMusicaResponse>> {}
