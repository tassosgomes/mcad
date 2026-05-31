package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

public record RegistrarPagamentoCommand(
    UUID licencaId,
    BigDecimal quantidadeUdas,
    ActorSnapshot actor
) implements Command<PagamentoResponse> {

    public RegistrarPagamentoCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public RegistrarPagamentoCommand(UUID licencaId, BigDecimal quantidadeUdas, String autor) {
        this(licencaId, quantidadeUdas, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
