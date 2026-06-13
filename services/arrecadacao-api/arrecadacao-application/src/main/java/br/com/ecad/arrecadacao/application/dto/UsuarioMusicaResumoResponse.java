package br.com.ecad.arrecadacao.application.dto;

import java.util.UUID;

public record UsuarioMusicaResumoResponse(
    UUID id, String razaoSocial, String cnpj
) {}
