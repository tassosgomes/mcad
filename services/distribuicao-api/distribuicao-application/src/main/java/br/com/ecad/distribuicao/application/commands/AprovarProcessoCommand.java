package br.com.ecad.distribuicao.application.commands;

import java.util.Objects;
import java.util.UUID;

public record AprovarProcessoCommand(
        UUID processoId,
        String autor) {

    public AprovarProcessoCommand {
        Objects.requireNonNull(processoId, "processoId must not be null");
        autor = autor == null ? "" : autor.trim();
    }
}
