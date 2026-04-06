package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import java.util.UUID;

public record AtivarUsuarioMusicaCommand(
    UUID id,
    String justificativa,
    String autor
) implements Command<Void> {}
