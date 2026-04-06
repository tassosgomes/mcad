package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import java.util.UUID;

public record InativarUsuarioMusicaCommand(
    UUID id,
    String justificativa,
    String autor
) implements Command<Void> {}
