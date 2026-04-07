package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;

import java.util.UUID;

public record ReativarLicencaCommand(
    UUID id, String justificativa, String autor
) implements Command<LicencaResponse> {}
