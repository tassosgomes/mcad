package br.com.ecad.distribuicao.domain.calculo;

import java.util.List;
import java.util.Objects;

public record OwnershipSnapshot(
        List<ObraOwnership> obras,
        List<FonogramaOwnership> fonogramas) {

    public OwnershipSnapshot {
        obras = List.copyOf(Objects.requireNonNull(obras, "obras must not be null"));
        fonogramas = List.copyOf(Objects.requireNonNull(fonogramas, "fonogramas must not be null"));
    }
}
