package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

public record AjustarUdaCommand(
    BigDecimal valor,
    LocalDate dataVigencia,
    ActorSnapshot actor
) implements Command<UdaResponse> {

    public AjustarUdaCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public AjustarUdaCommand(BigDecimal valor, LocalDate dataVigencia, String autor) {
        this(valor, dataVigencia, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
