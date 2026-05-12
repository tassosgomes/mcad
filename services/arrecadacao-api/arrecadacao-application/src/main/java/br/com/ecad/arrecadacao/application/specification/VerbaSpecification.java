package br.com.ecad.arrecadacao.application.specification;

import br.com.ecad.arrecadacao.application.queries.ListarVerbasQuery;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import org.springframework.data.jpa.domain.Specification;

public class VerbaSpecification {

    private VerbaSpecification() {}

    /**
     * Constrói a Specification combinada a partir dos filtros da query de listagem.
     */
    public static Specification<Verba> toSpec(ListarVerbasQuery query) {
        return Specification.where(comRubricaSigla(query.rubricaSigla()))
                .and(comPeriodo(query.periodo()))
                .and(comPeriodoEntre(query.periodoInicio(), query.periodoFim()))
                .and(comStatus(query.status()));
    }

    /**
     * Filtra por sigla da rubrica (exact match, case-insensitive).
     */
    public static Specification<Verba> comRubricaSigla(String sigla) {
        if (sigla == null || sigla.isBlank()) return null;
        return (root, query, cb) ->
            cb.equal(cb.lower(root.get("rubrica").get("sigla")), sigla.toLowerCase());
    }

    /**
     * Filtra por período exato (YYYY-MM).
     */
    public static Specification<Verba> comPeriodo(String periodo) {
        if (periodo == null || periodo.isBlank()) return null;
        return (root, query, cb) ->
            cb.equal(root.get("periodo"), periodo);
    }

    /**
     * Filtra por intervalo de período (ambos inclusive).
     * Só aplica o filtro se ao menos um dos limites estiver presente.
     */
    public static Specification<Verba> comPeriodoEntre(String inicio, String fim) {
        if ((inicio == null || inicio.isBlank()) && (fim == null || fim.isBlank())) return null;
        return (root, query, cb) -> {
            if (inicio != null && !inicio.isBlank() && (fim == null || fim.isBlank())) {
                return cb.greaterThanOrEqualTo(root.get("periodo"), inicio);
            }
            if (fim != null && !fim.isBlank() && (inicio == null || inicio.isBlank())) {
                return cb.lessThanOrEqualTo(root.get("periodo"), fim);
            }
            return cb.between(root.get("periodo"), inicio, fim);
        };
    }

    /**
     * Filtra por status da verba.
     */
    public static Specification<Verba> comStatus(StatusVerba status) {
        if (status == null) return null;
        return (root, query, cb) ->
            cb.equal(root.get("status"), status);
    }
}
