package br.com.ecad.arrecadacao.application.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UdaResponse(
    UUID id,
    String valor,
    LocalDate dataVigencia,
    Instant criadoEm,
    String criadoPor
) {}
