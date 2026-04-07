package br.com.ecad.arrecadacao.application.queries;

import br.com.ecad.arrecadacao.application.cqrs.Query;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;

import java.util.UUID;

public record ListarPagamentosQuery(
    int page, int size, String sort,
    UUID usuarioMusicaId, String razaoSocial,
    String rubricaSigla, String periodo,
    StatusPagamento status
) implements Query<PageResponse<PagamentoResponse>> {}
