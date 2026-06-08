package br.com.ecad.distribuicao.application.queries;

import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import java.util.List;
import java.util.UUID;

public record ListarAjustesEstornoQuery(
        String rubrica,
        String periodoOrigem,
        List<StatusAjusteEstorno> status,
        UUID pagamentoId,
        int page,
        int size,
        String sort) {
}
