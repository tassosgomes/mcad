package br.com.ecad.arrecadacao.application.dto;

import java.util.UUID;

public record LicencaResumoResponse(
    UUID id,
    String status,
    UsuarioMusicaResumoResponse usuarioMusica,
    RubricaResumoResponse rubrica
) {}
