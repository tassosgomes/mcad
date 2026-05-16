package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public class ProcessoSpecification {

    private ProcessoSpecification() {}

    public static Specification<ProcessoDistribuicao> comFiltros(
            String rubrica, String periodo, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (rubrica != null && !rubrica.isBlank()) {
                predicates.add(cb.equal(root.get("rubricaSigla"), rubrica));
            }
            if (periodo != null && !periodo.isBlank()) {
                predicates.add(cb.equal(root.get("periodo"), periodo));
            }
            if (status != null && !status.isBlank()) {
                List<StatusProcesso> statusList = Arrays.stream(status.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(StatusProcesso::valueOf)
                        .toList();
                if (!statusList.isEmpty()) {
                    predicates.add(root.get("status").in(statusList));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
