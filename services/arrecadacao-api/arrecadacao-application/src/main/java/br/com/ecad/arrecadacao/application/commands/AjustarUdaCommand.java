package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AjustarUdaCommand(
    BigDecimal valor,
    LocalDate dataVigencia,
    String autor
) implements Command<UdaResponse> {}
