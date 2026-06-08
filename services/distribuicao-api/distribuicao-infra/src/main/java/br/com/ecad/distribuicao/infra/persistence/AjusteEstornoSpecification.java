package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public class AjusteEstornoSpecification {

    private AjusteEstornoSpecification() {}

    public static Specification<AjusteEstorno> comFiltros(
            String rubrica,
            String periodoOrigem,
            List<StatusAjusteEstorno> statusList,
            UUID pagamentoId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (rubrica != null && !rubrica.isBlank()) {
                predicates.add(cb.equal(root.get("rubricaSigla"), rubrica));
            }
            if (periodoOrigem != null && !periodoOrigem.isBlank()) {
                predicates.add(cb.equal(root.get("periodoOrigem"), periodoOrigem));
            }
            if (statusList != null && !statusList.isEmpty()) {
                predicates.add(root.get("status").in(statusList));
            }
            if (pagamentoId != null) {
                predicates.add(cb.equal(root.get("pagamentoId"), pagamentoId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
