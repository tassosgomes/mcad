package br.com.ecad.arrecadacao.application.dto;

import java.util.UUID;

public record RubricaResponse(
    UUID id,
    String sigla,
    String nome,
    boolean exigeClassificacao,
    boolean ativo
) {}
