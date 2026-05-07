package br.com.ecad.distribuicao.domain.exceptions;

public class TransicaoInvalidaException extends RuntimeException {
    public TransicaoInvalidaException(String message) {
        super(message);
    }
}
