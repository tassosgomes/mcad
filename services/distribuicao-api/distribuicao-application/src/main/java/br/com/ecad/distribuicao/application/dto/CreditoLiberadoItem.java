package br.com.ecad.distribuicao.application.dto;

import java.time.Instant;
import java.util.UUID;

public record CreditoLiberadoItem(
    UUID obraId,
    String obraNome,
    UUID fonogramaId,
    String fonogramaNome,
    String categoria,
    UUID processoOrigemId,
    String motivoOriginal,
    String valorCredito,
    Instant liberadoEm
) {}
