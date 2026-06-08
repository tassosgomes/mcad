package br.com.ecad.arrecadacao.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CriarRubricaRequest(
    @NotBlank @Size(min = 3, max = 100) String nome,
    boolean exigeClassificacao,
    @Size(max = 20) String sigla
) {}
