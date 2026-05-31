package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;

import java.util.Objects;
import java.util.UUID;

public record SuspenderLicencaCommand(
    UUID id, String justificativa, ActorSnapshot actor
) implements Command<LicencaResponse> {

    public SuspenderLicencaCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public SuspenderLicencaCommand(UUID id, String justificativa, String autor) {
        this(id, justificativa, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
