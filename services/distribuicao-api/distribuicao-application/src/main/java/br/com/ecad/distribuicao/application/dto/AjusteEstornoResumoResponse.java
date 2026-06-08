package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AjusteEstornoResumoResponse(
        UUID id,
        UUID eventId,
        UUID pagamentoId,
        UUID licencaId,
        RubricaResumoResponse rubrica,
        String periodoOrigem,
        BigDecimal valorEstornadoBruto,
        BigDecimal valorAjusteLiquido,
        BigDecimal valorAplicado,
        StatusAjusteEstorno status,
        UUID processoOrigemId,
        UUID processoAplicacaoId,
        String justificativa,
        String estornadoPor,
        Instant estornadoEm,
        Instant recebidoEm,
        Instant previstoEm,
        Instant aplicadoEm) {
}
