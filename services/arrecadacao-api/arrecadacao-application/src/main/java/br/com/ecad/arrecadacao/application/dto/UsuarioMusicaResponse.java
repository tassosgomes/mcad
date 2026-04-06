package br.com.ecad.arrecadacao.application.dto;

import java.time.Instant;
import java.util.UUID;

public record UsuarioMusicaResponse(
    UUID id,
    String razaoSocial,
    String nomeFantasia,
    String cnpjValor,
    String cnpjFormatado,
    EnderecoResponse endereco,
    ContatoResponse contato,
    String status,
    Instant criadoEm,
    Instant atualizadoEm
) {}
