package br.com.ecad.arrecadacao.domain.exceptions;

public class PagamentoDuplicadoException extends RuntimeException {
    public PagamentoDuplicadoException(String message) {
        super(message);
    }
}
