package br.com.ecad.distribuicao.domain.calculo;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record CalculoCreditosInput(
        UUID processoId,
        BigDecimal verbaLiquida,
        List<ExecucaoRol> execucoes,
        OwnershipSnapshot ownershipSnapshot) {

    public CalculoCreditosInput {
        Objects.requireNonNull(processoId, "processoId must not be null");
        Objects.requireNonNull(verbaLiquida, "verbaLiquida must not be null");
        execucoes = List.copyOf(Objects.requireNonNull(execucoes, "execucoes must not be null"));
        Objects.requireNonNull(ownershipSnapshot, "ownershipSnapshot must not be null");
    }
}
