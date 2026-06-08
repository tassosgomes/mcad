package br.com.ecad.distribuicao.application.dto;

import br.com.ecad.distribuicao.domain.entities.Rubrica;
import java.util.UUID;

public record RubricaResponse(
        UUID id,
        String sigla,
        String nome,
        boolean exigeClassificacao,
        boolean ativo) {

    public static RubricaResponse from(Rubrica rubrica) {
        return new RubricaResponse(
                rubrica.getId(),
                rubrica.getSigla(),
                rubrica.getNome(),
                rubrica.isExigeClassificacao(),
                rubrica.isAtivo());
    }
}
