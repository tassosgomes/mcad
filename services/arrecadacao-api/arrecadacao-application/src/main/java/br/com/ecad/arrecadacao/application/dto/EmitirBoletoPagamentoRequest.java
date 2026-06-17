package br.com.ecad.arrecadacao.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EmitirBoletoPagamentoRequest(
        @NotNull UUID licencaId,
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal quantidadeUdas,
        @NotNull @FutureOrPresent LocalDate dataVencimento
) {}
