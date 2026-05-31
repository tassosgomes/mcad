package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import java.util.Objects;
import java.util.UUID;

public record InativarUsuarioMusicaCommand(
    UUID id,
    String justificativa,
    ActorSnapshot actor
) implements Command<Void> {

    public InativarUsuarioMusicaCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public InativarUsuarioMusicaCommand(UUID id, String justificativa, String autor) {
        this(id, justificativa, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
