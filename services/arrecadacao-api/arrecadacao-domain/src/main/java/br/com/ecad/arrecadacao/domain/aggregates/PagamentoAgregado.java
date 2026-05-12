package br.com.ecad.arrecadacao.domain.aggregates;

import java.math.BigDecimal;

/**
 * Resultado agregado de pagamentos CONFIRMADOS para uma (rubricaId, periodo).
 *
 * <p>Retornado por {@code PagamentoRepository#sumAndCountConfirmados} para que
 * {@code VerbaServiceImpl} recompute a verba sem carregar a coleção inteira (F05).</p>
 *
 * <p>{@code totalBruto} é a soma de {@code Pagamento.valorBruto} (DECIMAL 18,6).
 * O serviço de verba aplicará {@code setScale(2, HALF_UP)} ao usar o valor.
 * {@code quantidade} corresponde à contagem de pagamentos CONFIRMADOS.</p>
 *
 * <p>Quando não há pagamentos confirmados, o COALESCE do JPQL garante
 * {@code totalBruto = ZERO} e {@code quantidade = 0} — nunca null.</p>
 *
 * @param totalBruto soma de valorBruto dos pagamentos CONFIRMADOS (nunca null)
 * @param quantidade contagem de pagamentos CONFIRMADOS (0 quando não houver)
 */
public record PagamentoAgregado(BigDecimal totalBruto, long quantidade) {
}
