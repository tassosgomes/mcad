package br.com.ecad.arrecadacao.application.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LicencaResponse(
    UUID id,
    UsuarioMusicaResumoResponse usuarioMusica,
    RubricaResumoResponse rubrica,
    LocalDate dataInicio, LocalDate dataFim,
    String status,
    Instant criadoEm, Instant atualizadoEm
) {}
