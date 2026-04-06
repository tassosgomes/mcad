package br.com.ecad.arrecadacao.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;

public record AtualizarUsuarioMusicaRequest(
    @NotBlank @Size(min = 3, max = 200) String razaoSocial,
    @Size(max = 200) String nomeFantasia,
    @NotNull @Valid EnderecoRequest endereco,
    @NotNull @Valid ContatoRequest contato
) {}
