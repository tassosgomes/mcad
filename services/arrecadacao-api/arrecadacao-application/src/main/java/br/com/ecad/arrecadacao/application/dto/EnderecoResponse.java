package br.com.ecad.arrecadacao.application.dto;

public record EnderecoResponse(
    String cep,
    String logradouro,
    String numero,
    String complemento,
    String bairro,
    String cidade,
    String uf
) {}
