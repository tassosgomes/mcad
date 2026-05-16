package br.com.ecad.distribuicao.infra.events;

import java.util.UUID;

/**
 * Payload do CloudEvent para eventos de Rol da Identificação.
 * Usado pelos eventos {@code identificacao.rol.fechado} e {@code identificacao.rol.cancelado}.
 */
public record RolEventPayload(
        String rubricaSigla,
        String periodo,
        UUID captacaoId,
        int totalExecucoes,
        String payloadJson) {
}
