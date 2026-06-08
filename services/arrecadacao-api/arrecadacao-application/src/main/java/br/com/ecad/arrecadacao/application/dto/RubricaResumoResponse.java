package br.com.ecad.arrecadacao.application.dto;

import java.util.UUID;

public record RubricaResumoResponse(
    UUID id, String sigla, String nome, boolean ativo
) {}
