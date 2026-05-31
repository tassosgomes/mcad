package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;

import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

public record CriarLicencaCommand(
    UUID usuarioMusicaId, UUID rubricaId,
    LocalDate dataInicio, LocalDate dataFim, ActorSnapshot actor
) implements Command<LicencaResponse> {

    public CriarLicencaCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public CriarLicencaCommand(UUID usuarioMusicaId, UUID rubricaId,
                               LocalDate dataInicio, LocalDate dataFim, String autor) {
        this(usuarioMusicaId, rubricaId, dataInicio, dataFim, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
