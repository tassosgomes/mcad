package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;

import java.util.Objects;
import java.util.UUID;

public record EstornarPagamentoCommand(
    UUID pagamentoId,
    String justificativa,
    ActorSnapshot actor
) implements Command<PagamentoResponse> {

    public EstornarPagamentoCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public EstornarPagamentoCommand(UUID pagamentoId, String justificativa, String autor) {
        this(pagamentoId, justificativa, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
