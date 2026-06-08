package br.com.ecad.distribuicao.infra.events;

/**
 * Lançada quando um CloudEvent recebido falha na validação de campos obrigatórios
 * ou de formato. O listener descarta o evento sem reentrega.
 */
public class EventoInvalidoException extends RuntimeException {

    public EventoInvalidoException(String message) {
        super(message);
    }
}
