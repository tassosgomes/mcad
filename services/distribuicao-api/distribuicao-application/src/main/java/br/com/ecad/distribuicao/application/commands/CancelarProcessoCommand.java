package br.com.ecad.distribuicao.application.commands;

import java.util.Objects;
import java.util.UUID;

public record CancelarProcessoCommand(
        UUID processoId,
        String justificativa,
        String autor) {

    public CancelarProcessoCommand {
        Objects.requireNonNull(processoId, "processoId must not be null");
        Objects.requireNonNull(justificativa, "justificativa must not be null");
        autor = autor == null ? "" : autor.trim();
    }
}
