package br.com.ecad.arrecadacao.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContatoRequest(
    @NotBlank @Size(max = 200) String nomeResponsavel,
    @Size(max = 20) String telefone,
    @Size(max = 100) String email
) {}
