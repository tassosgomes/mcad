package br.com.ecad.arrecadacao.domain.exceptions;

public class CnpjDuplicadoException extends RuntimeException {
    public CnpjDuplicadoException(String message) {
        super(message);
    }
}
