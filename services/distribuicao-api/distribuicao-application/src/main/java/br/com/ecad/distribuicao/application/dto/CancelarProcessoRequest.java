package br.com.ecad.distribuicao.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelarProcessoRequest(
        @NotBlank(message = "justificativa is required")
        @Size(min = 10, max = 500, message = "justificativa must be between 10 and 500 characters")
        String justificativa) {
}
