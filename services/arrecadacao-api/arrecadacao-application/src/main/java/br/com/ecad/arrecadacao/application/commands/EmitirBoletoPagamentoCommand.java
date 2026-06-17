package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

public record EmitirBoletoPagamentoCommand(
        UUID licencaId,
        BigDecimal quantidadeUdas,
        LocalDate dataVencimento,
        ActorSnapshot actor
) implements Command<PagamentoResponse> {

    public EmitirBoletoPagamentoCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
