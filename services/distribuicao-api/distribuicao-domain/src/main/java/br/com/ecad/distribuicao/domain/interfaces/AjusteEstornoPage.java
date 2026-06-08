package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import java.util.List;

public record AjusteEstornoPage(
        List<AjusteEstorno> items,
        int page,
        int size,
        long totalItems,
        int totalPages) {
}
