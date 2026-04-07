package br.com.ecad.arrecadacao.domain.interfaces;

import java.util.UUID;

/**
 * Contrato de integração com o serviço de verba (F05).
 * Implementação real fornecida pelo módulo de Verba.
 * Nos testes de F06, usa-se um mock.
 */
public interface VerbaService {

    /**
     * Valida se a verba do período permite alterações (status ABERTA).
     * Lança VerbaEmDistribuicaoException se EM_DISTRIBUICAO ou DISTRIBUIDA.
     *
     * @param licencaId ID da licença do pagamento
     * @param periodo   período no formato YYYY-MM
     */
    void validarLockParaEstorno(UUID licencaId, String periodo);

    /**
     * Recalcula verba líquida somando apenas pagamentos CONFIRMADOS.
     * Publica evento arrecadacao.verba.disponivel com valor atualizado.
     *
     * @param rubricaSigla sigla da rubrica
     * @param periodo      período no formato YYYY-MM
     */
    void recalcularVerba(String rubricaSigla, String periodo);
}
