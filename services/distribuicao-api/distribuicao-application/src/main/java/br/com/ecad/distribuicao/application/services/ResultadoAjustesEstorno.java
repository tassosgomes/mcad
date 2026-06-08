package br.com.ecad.distribuicao.application.services;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoLinha;
import java.math.BigDecimal;
import java.util.List;

/**
 * Resumo do resultado de uma operação de ajuste de estorno (previsão, efetivação ou cancelamento).
 *
 * <p>{@code valorTotal} é negativo ou {@link BigDecimal#ZERO} nas operações de previsão/efetivação,
 * pois representa o débito líquido aplicado sobre os créditos do processo.
 * No cancelamento, representa a soma dos valores que foram revertidos (pode ser positivo).
 */
public record ResultadoAjustesEstorno(
        List<AjusteEstorno> ajustes,
        List<AjusteEstornoLinha> linhas,
        int total,
        BigDecimal valorTotal) {

    public static ResultadoAjustesEstorno empty() {
        return new ResultadoAjustesEstorno(List.of(), List.of(), 0, BigDecimal.ZERO);
    }
}
