package br.com.ecad.arrecadacao.domain.interfaces;

import java.util.UUID;

/**
 * Contrato de integração com o serviço de verba (F05).
 * Chamado por RegistrarPagamento (F04) e EstornarPagamento (F06) para validar
 * o lock de distribuição e disparar o recálculo da verba líquida.
 *
 * <p>Lança {@code VerbaEmDistribuicaoException} (HTTP 422) quando a verba do
 * período está {@code EM_DISTRIBUICAO} ou {@code DISTRIBUIDA}.</p>
 *
 * <p>Implementação real fornecida por {@code VerbaServiceImpl} (tarefa 5.0).
 * Nos testes unitários de F04/F06, usa-se mock ou stub configurável.</p>
 */
public interface VerbaService {

    /**
     * Bloqueia alteração quando verba está EM_DISTRIBUICAO ou DISTRIBUIDA.
     * Chamado por RegistrarPagamento (F04) e EstornarPagamento (F06).
     * Lança VerbaEmDistribuicaoException (HTTP 422).
     *
     * @param rubricaId ID da rubrica (chave de partição da verba)
     * @param periodo   período no formato YYYY-MM
     */
    void validarLockParaAlteracao(UUID rubricaId, String periodo);

    /**
     * Recalcula valor bruto, deduções e líquida; publica
     * arrecadacao.verba.disponivel via Outbox. Idempotente em retry.
     *
     * @param rubricaId ID da rubrica (chave de partição da verba)
     * @param periodo   período no formato YYYY-MM
     */
    void recalcularVerba(UUID rubricaId, String periodo);
}
