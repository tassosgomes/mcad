package br.com.ecad.distribuicao.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CriarProcessoRequest(
        @NotBlank(message = "rubricaSigla is required")
        String rubricaSigla,

        @NotBlank(message = "periodo is required")
        @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "periodo must be in YYYY-MM format")
        String periodo) {
}
