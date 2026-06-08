package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import java.util.UUID;

public record ProcessoResumoLiteResponse(
        UUID id,
        String rubricaSigla,
        String periodo,
        StatusProcesso status) {
}
