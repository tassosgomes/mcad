package br.com.ecad.arrecadacao.domain.projections;

/**
 * Filtro para a query agregada de verbas por rubrica (RF-19).
 * Todos os campos são opcionais — null significa "sem filtro".
 */
public record VerbaAgregadoFiltro(
        String rubricaSigla,
        String periodoInicio,
        String periodoFim
) {}
