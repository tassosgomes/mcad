package br.com.ecad.distribuicao.application.audit;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProcessoSnapshot(
        UUID id,
        String rubricaSigla,
        String periodo,
        StatusProcesso status,
        BigDecimal verbaLiquida,
        Integer totalExecucoes,
        String justificativaCancelamento,
        Instant criadoEm,
        Instant calculadoEm,
        Instant aprovadoEm,
        Instant finalizadoEm,
        Instant canceladoEm
) {

    public static ProcessoSnapshot from(ProcessoDistribuicao processo) {
        return new ProcessoSnapshot(
                processo.getId(),
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                processo.getStatus(),
                processo.getVerbaLiquida(),
                processo.getTotalExecucoes(),
                processo.getJustificativaCancelamento(),
                processo.getCriadoEm(),
                processo.getCalculadoEm(),
                processo.getAprovadoEm(),
                processo.getFinalizadoEm(),
                processo.getCanceladoEm()
        );
    }
}
