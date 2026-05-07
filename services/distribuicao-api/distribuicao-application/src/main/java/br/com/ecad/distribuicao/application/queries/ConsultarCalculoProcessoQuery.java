package br.com.ecad.distribuicao.application.queries;

import java.util.UUID;

public record ConsultarCalculoProcessoQuery(
        UUID processoId,
        int page,
        int size,
        String categoria,
        UUID titularId,
        UUID obraId) {
}
