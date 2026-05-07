package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.calculo.ResumoCalculo;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CalcularProcessoResponse(
        UUID processoId,
        StatusProcesso status,
        String rubricaSigla,
        String periodo,
        BigDecimal verbaLiquida,
        int totalExecucoes,
        int totalObras,
        BigDecimal totalPontos,
        int totalCreditos,
        BigDecimal valorTotalCalculado,
        Instant calculadoEm) {

    public static CalcularProcessoResponse from(
            ProcessoDistribuicao processo,
            ResumoCalculo resumo) {
        return new CalcularProcessoResponse(
                processo.getId(),
                processo.getStatus(),
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                resumo.verbaLiquida(),
                resumo.totalExecucoes(),
                resumo.totalObras(),
                resumo.totalPontos(),
                resumo.totalCreditos(),
                resumo.valorTotalCalculado(),
                processo.getCalculadoEm());
    }
}
