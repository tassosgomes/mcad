package br.com.ecad.arrecadacao.application.dto;

import java.time.Instant;
import java.util.UUID;

public record PagamentoResponse(
    UUID id,
    LicencaResumoResponse licenca,
    String quantidadeUdas,
    String valorUdaNoMomento,
    String valorBruto,
    String periodo,
    String status,
    Instant dataRegistro,
    Instant criadoEm,
    Instant atualizadoEm,
    // F06 — campos de estorno (nullable quando CONFIRMADO)
    String justificativaEstorno,
    String estornadoPor,
    Instant estornadoEm
) {}
