package br.com.ecad.arrecadacao.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EnderecoRequest(
    @NotBlank @Size(max = 8) String cep,
    @NotBlank @Size(max = 200) String logradouro,
    @NotBlank @Size(max = 20) String numero,
    @Size(max = 100) String complemento,
    @NotBlank @Size(max = 100) String bairro,
    @NotBlank @Size(max = 100) String cidade,
    @NotBlank @Size(max = 2) String uf
) {}
