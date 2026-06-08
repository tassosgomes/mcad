package br.com.ecad.distribuicao.domain.filters;

import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import java.util.List;
import java.util.UUID;

public record AjusteEstornoFiltro(
        String rubrica,
        String periodoOrigem,
        List<StatusAjusteEstorno> status,
        UUID pagamentoId) {
}
