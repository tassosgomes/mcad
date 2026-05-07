package br.com.ecad.distribuicao.domain.calculo;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record FonogramaOwnership(
        UUID fonogramaId,
        UUID obraId,
        List<ParticipacaoOwnership> participacoes) {

    public FonogramaOwnership {
        Objects.requireNonNull(fonogramaId, "fonogramaId must not be null");
        Objects.requireNonNull(obraId, "obraId must not be null");
        participacoes = List.copyOf(Objects.requireNonNull(participacoes, "participacoes must not be null"));
    }
}
