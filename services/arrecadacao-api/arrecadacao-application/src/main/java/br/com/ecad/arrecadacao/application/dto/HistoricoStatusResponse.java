package br.com.ecad.arrecadacao.application.dto;

import java.time.Instant;
import java.util.UUID;

public record HistoricoStatusResponse(
    UUID id,
    String statusAnterior,
    String statusNovo,
    String justificativa,
    String autor,
    Instant data
) {}
