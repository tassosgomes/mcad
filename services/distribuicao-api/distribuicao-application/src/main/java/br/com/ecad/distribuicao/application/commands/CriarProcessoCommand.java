package br.com.ecad.distribuicao.application.commands;

import java.util.Objects;

public record CriarProcessoCommand(
        String rubricaSigla,
        String periodo,
        String analistaResponsavel) {

    public CriarProcessoCommand {
        Objects.requireNonNull(rubricaSigla, "rubricaSigla must not be null");
        Objects.requireNonNull(periodo, "periodo must not be null");
        analistaResponsavel = analistaResponsavel == null ? "" : analistaResponsavel.trim();
    }
}
