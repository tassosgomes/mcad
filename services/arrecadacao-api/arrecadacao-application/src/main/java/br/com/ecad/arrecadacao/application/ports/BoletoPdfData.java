package br.com.ecad.arrecadacao.application.ports;

import java.time.LocalDate;

public record BoletoPdfData(
        String pagamentoId,
        String razaoSocial,
        String documento,
        String rubrica,
        String periodo,
        String valor,
        LocalDate vencimento,
        String nossoNumero,
        String linhaDigitavel,
        String codigoBarras
) {}
