package br.com.ecad.distribuicao.domain.filters;

import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import java.util.UUID;

public record CreditoFiltro(
        UUID processoId,
        CategoriaCredito categoria,
        UUID titularId,
        UUID obraId,
        StatusCredito status,
        MotivoRetencao motivoRetencao) {
}
