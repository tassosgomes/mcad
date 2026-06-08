package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record AjusteEstornoCalculoItemResponse(
        UUID ajusteId,
        UUID pagamentoId,
        UUID licencaId,
        String periodoOrigem,
        UUID processoOrigemId,
        StatusAjusteEstorno status,
        String justificativa,
        BigDecimal valorEstornadoBruto,
        BigDecimal valorAjusteLiquido,
        BigDecimal valorAplicado,
        int totalLinhas,
        List<AjusteEstornoLinhaResponse> linhas) {
}
