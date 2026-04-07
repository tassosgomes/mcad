package br.com.ecad.arrecadacao.domain.exceptions;

/**
 * Lançada quando uma operação de estorno é bloqueada porque
 * a verba do rubrica+período está com status EM_DISTRIBUICAO ou DISTRIBUIDA.
 * Mapeada para HTTP 422 pelo GlobalExceptionHandler.
 */
public class VerbaEmDistribuicaoException extends RuntimeException {

    public VerbaEmDistribuicaoException(String message) {
        super(message);
    }
}
