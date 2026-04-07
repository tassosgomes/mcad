package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;

import java.math.BigDecimal;
import java.util.UUID;

public record RegistrarPagamentoCommand(
    UUID licencaId,
    BigDecimal quantidadeUdas,
    String autor
) implements Command<PagamentoResponse> {}
