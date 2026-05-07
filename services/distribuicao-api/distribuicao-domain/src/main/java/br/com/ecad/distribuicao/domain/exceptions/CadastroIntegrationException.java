package br.com.ecad.distribuicao.domain.exceptions;

public class CadastroIntegrationException extends RuntimeException {

    public CadastroIntegrationException(String message) {
        super(message);
    }

    public CadastroIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
