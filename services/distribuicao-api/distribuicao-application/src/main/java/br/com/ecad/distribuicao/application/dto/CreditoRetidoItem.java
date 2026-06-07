package br.com.ecad.distribuicao.application.dto;

import java.time.Instant;
import java.util.UUID;

public record CreditoRetidoItem(
    UUID obraId,
    String obraNome,
    UUID fonogramaId,
    String fonogramaNome,
    String categoria,
    String motivoRetencao,
    String valorCredito,
    Instant retidoEm
) {}
