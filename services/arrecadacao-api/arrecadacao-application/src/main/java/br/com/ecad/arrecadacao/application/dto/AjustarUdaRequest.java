package br.com.ecad.arrecadacao.application.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AjustarUdaRequest(
    @NotNull @Positive BigDecimal valor,
    @NotNull LocalDate dataVigencia
) {}
