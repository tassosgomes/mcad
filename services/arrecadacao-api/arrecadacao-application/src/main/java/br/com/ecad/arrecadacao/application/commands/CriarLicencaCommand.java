package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;

import java.time.LocalDate;
import java.util.UUID;

public record CriarLicencaCommand(
    UUID usuarioMusicaId, UUID rubricaId,
    LocalDate dataInicio, LocalDate dataFim, String autor
) implements Command<LicencaResponse> {}
