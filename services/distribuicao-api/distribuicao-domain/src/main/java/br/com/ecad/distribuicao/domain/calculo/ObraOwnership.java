package br.com.ecad.distribuicao.domain.calculo;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record ObraOwnership(
        UUID obraId,
        String titulo,
        String status,
        List<ParticipacaoOwnership> titularidades) {

    public ObraOwnership {
        Objects.requireNonNull(obraId, "obraId must not be null");
        Objects.requireNonNull(titulo, "titulo must not be null");
        Objects.requireNonNull(status, "status must not be null");
        titularidades = List.copyOf(Objects.requireNonNull(titularidades, "titularidades must not be null"));
    }
}
