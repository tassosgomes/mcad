package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;

import java.util.UUID;

public record SuspenderLicencaCommand(
    UUID id, String justificativa, String autor
) implements Command<LicencaResponse> {}
