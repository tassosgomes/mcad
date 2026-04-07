package br.com.ecad.arrecadacao.application.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CriarLicencaRequest(
    @NotNull UUID usuarioMusicaId,
    @NotNull UUID rubricaId,
    @NotNull LocalDate dataInicio,
    LocalDate dataFim
) {}
