package br.com.ecad.arrecadacao.application.dto;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UdaResponse(
    UUID id,
    String valor,
    LocalDate dataVigencia,
    Instant criadoEm,
    String criadoPor,
    ActorDisplayResponse criadoPorAtor
) {

    public UdaResponse(
            UUID id,
            String valor,
            LocalDate dataVigencia,
            Instant criadoEm,
            String criadoPor
    ) {
        this(id, valor, dataVigencia, criadoEm, criadoPor, null);
    }
}
