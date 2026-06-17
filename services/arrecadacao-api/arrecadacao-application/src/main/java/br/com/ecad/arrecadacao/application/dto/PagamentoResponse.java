package br.com.ecad.arrecadacao.application.dto;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import java.time.Instant;
import java.time.LocalDate;
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
    ActorDisplayResponse estornadoPorAtor,
    Instant estornadoEm,
    String boletoNossoNumero,
    String boletoLinhaDigitavel,
    String boletoCodigoBarras,
    LocalDate boletoVencimento,
    Instant boletoEmitidoEm
) {

    public PagamentoResponse(
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
            String justificativaEstorno,
            String estornadoPor,
            ActorDisplayResponse estornadoPorAtor,
            Instant estornadoEm
    ) {
        this(
                id,
                licenca,
                quantidadeUdas,
                valorUdaNoMomento,
                valorBruto,
                periodo,
                status,
                dataRegistro,
                criadoEm,
                atualizadoEm,
                justificativaEstorno,
                estornadoPor,
                estornadoPorAtor,
                estornadoEm,
                null,
                null,
                null,
                null,
                null);
    }

    public PagamentoResponse(
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
            String justificativaEstorno,
            String estornadoPor,
            Instant estornadoEm
    ) {
        this(
                id,
                licenca,
                quantidadeUdas,
                valorUdaNoMomento,
                valorBruto,
                periodo,
                status,
                dataRegistro,
                criadoEm,
                atualizadoEm,
                justificativaEstorno,
                estornadoPor,
                null,
                estornadoEm,
                null,
                null,
                null,
                null,
                null);
    }
}
