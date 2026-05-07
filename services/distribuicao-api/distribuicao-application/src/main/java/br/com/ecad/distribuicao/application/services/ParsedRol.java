package br.com.ecad.distribuicao.application.services;

import br.com.ecad.distribuicao.domain.calculo.ExecucaoRol;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record ParsedRol(
        List<ExecucaoRol> execucoes,
        Set<UUID> obraIds,
        Set<UUID> fonogramaIds) {

    public ParsedRol {
        execucoes = List.copyOf(Objects.requireNonNull(execucoes, "execucoes must not be null"));
        obraIds = Set.copyOf(Objects.requireNonNull(obraIds, "obraIds must not be null"));
        fonogramaIds = Set.copyOf(Objects.requireNonNull(fonogramaIds, "fonogramaIds must not be null"));
    }
}
