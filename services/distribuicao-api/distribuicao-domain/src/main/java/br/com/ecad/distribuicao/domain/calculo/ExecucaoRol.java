package br.com.ecad.distribuicao.domain.calculo;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

public record ExecucaoRol(
        UUID obraId,
        String obraTitulo,
        UUID fonogramaId,
        int quantidadeExecucoes,
        BigDecimal pesoTipoUtilizacao) {

    public ExecucaoRol {
        Objects.requireNonNull(obraId, "obraId must not be null");
        Objects.requireNonNull(obraTitulo, "obraTitulo must not be null");
        Objects.requireNonNull(pesoTipoUtilizacao, "pesoTipoUtilizacao must not be null");
    }
}
