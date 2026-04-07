package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;

import java.util.UUID;

public record EstornarPagamentoCommand(
    UUID pagamentoId,
    String justificativa,
    String autor
) implements Command<PagamentoResponse> {}
