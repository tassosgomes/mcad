package br.com.ecad.arrecadacao.application.dto;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import java.time.Instant;
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
    Instant estornadoEm
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
                estornadoEm);
    }
}
