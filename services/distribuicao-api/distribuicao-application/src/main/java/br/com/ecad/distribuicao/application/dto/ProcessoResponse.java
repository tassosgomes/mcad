package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProcessoResponse(
        UUID id,
        String rubricaSigla,
        String periodo,
        StatusProcesso status,
        BigDecimal verbaLiquida,
        Integer totalExecucoes,
        Integer totalObras,
        BigDecimal totalPontos,
        Integer totalCreditos,
        BigDecimal valorTotalCalculado,
        Integer totalCreditosRetidosLiberados,
        BigDecimal valorTotalRetidosLiberados,
        String analistaResponsavel,
        String justificativaCancelamento,
        Instant criadoEm,
        Instant calculadoEm,
        Instant aprovadoEm,
        Instant finalizadoEm,
        Instant canceladoEm,
        UUID snapshotRolId,
        UUID snapshotVerbaId) {

    public static ProcessoResponse from(ProcessoDistribuicao processo) {
        return new ProcessoResponse(
                processo.getId(),
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                processo.getStatus(),
                processo.getVerbaLiquida(),
                processo.getTotalExecucoes(),
                processo.getTotalObras(),
                processo.getTotalPontos(),
                processo.getTotalCreditos(),
                processo.getValorTotalCalculado(),
                processo.getTotalCreditosRetidosLiberados(),
                processo.getValorTotalRetidosLiberados(),
                processo.getAnalistaResponsavel(),
                processo.getJustificativaCancelamento(),
                processo.getCriadoEm(),
                processo.getCalculadoEm(),
                processo.getAprovadoEm(),
                processo.getFinalizadoEm(),
                processo.getCanceladoEm(),
                processo.getSnapshotRolId(),
                processo.getSnapshotVerbaId());
    }
}
