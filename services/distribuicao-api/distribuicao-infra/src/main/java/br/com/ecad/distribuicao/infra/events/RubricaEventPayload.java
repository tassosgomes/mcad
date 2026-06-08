package br.com.ecad.distribuicao.infra.events;

public record RubricaEventPayload(
        String sigla,
        String nome,
        boolean exigeClassificacao,
        boolean ativo) {
}
