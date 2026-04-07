package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;

import java.util.UUID;

public record ListarLicencasQuery(
    int page, int size, String sort,
    UUID usuarioMusicaId, String razaoSocial, String rubricaSigla,
    StatusLicenca status, Boolean vigente
) implements Query<PageResponse<LicencaResponse>> {}
