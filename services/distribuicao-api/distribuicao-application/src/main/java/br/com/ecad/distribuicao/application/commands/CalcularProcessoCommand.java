package br.com.ecad.distribuicao.application.commands;

import java.util.Objects;
import java.util.UUID;

public record CalcularProcessoCommand(
        UUID processoId,
        String analista,
        String bearerToken) {

    public CalcularProcessoCommand {
        Objects.requireNonNull(processoId, "processoId must not be null");
        analista = analista == null ? "" : analista.trim();
        bearerToken = bearerToken == null ? "" : bearerToken.trim();
    }
}
