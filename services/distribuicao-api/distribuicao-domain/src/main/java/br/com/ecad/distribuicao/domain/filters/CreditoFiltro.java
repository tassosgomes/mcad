package br.com.ecad.distribuicao.domain.filters;

import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import java.util.UUID;

public record CreditoFiltro(
        UUID processoId,
        CategoriaCredito categoria,
        UUID titularId,
        UUID obraId) {
}
