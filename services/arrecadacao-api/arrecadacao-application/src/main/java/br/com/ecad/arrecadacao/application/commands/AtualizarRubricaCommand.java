package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;
import java.util.Objects;
import java.util.UUID;

public record AtualizarRubricaCommand(
    UUID id,
    String nome,
    boolean exigeClassificacao,
    ActorSnapshot actor
) implements Command<RubricaResponse> {

    public AtualizarRubricaCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public AtualizarRubricaCommand(UUID id, String nome, boolean exigeClassificacao, String autor) {
        this(id, nome, exigeClassificacao, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
