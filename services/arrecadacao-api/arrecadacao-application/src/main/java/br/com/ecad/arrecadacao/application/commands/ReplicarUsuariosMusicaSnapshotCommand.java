package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.ReplicarSnapshotResponse;

public record ReplicarUsuariosMusicaSnapshotCommand() implements Command<ReplicarSnapshotResponse> {
}
