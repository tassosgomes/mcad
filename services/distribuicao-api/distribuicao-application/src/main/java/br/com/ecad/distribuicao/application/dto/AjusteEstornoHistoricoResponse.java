package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import java.time.Instant;
import java.util.UUID;

public record AjusteEstornoHistoricoResponse(
        StatusAjusteEstorno status,
        UUID processoId,
        Instant ocorridoEm,
        String observacao) {
}
