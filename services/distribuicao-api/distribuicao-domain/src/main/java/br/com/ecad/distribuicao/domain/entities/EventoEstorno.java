package br.com.ecad.distribuicao.domain.entities;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Representação de domínio do payload de evento de estorno recebido via mensageria.
 * Usado pelas factories de {@link AjusteEstorno} para criar os registros de ajuste.
 */
public record EventoEstorno(
        UUID eventId,
        UUID pagamentoId,
        UUID licencaId,
        String rubricaSigla,
        String periodoOrigem,
        BigDecimal quantidadeUdas,
        BigDecimal valorEstornadoBruto,
        String justificativa,
        String estornadoPor,
        Instant estornadoEm
) {}
