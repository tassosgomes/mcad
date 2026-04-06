package br.com.ecad.arrecadacao.application.dto;

public record ContatoResponse(
    String nomeResponsavel,
    String telefone,
    String email
) {}
