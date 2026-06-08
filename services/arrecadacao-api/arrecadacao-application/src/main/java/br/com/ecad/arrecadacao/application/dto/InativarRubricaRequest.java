package br.com.ecad.arrecadacao.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InativarRubricaRequest(
    @NotBlank @Size(min = 10, max = 500) String justificativa
) {}
