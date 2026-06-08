package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.RubricaResponse;
import java.util.Objects;
import java.util.UUID;

public record CriarRubricaCommand(
    String nome,
    boolean exigeClassificacao,
    String siglaSugerida,
    ActorSnapshot actor
) implements Command<RubricaResponse> {

    public CriarRubricaCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public CriarRubricaCommand(String nome, boolean exigeClassificacao, String siglaSugerida, String autor) {
        this(nome, exigeClassificacao, siglaSugerida, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
