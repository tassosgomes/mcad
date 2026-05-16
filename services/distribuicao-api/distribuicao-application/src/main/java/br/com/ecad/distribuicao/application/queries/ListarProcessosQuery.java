package br.com.ecad.distribuicao.application.queries;

import java.util.List;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;

public record ListarProcessosQuery(
        String rubricaSigla,
        String periodo,
        String status,
        int page,
        int size) {
}
