package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import jakarta.persistence.EntityManager;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaProcessoRepository implements ProcessoRepository {

    private final EntityManager entityManager;

    public JpaProcessoRepository(EntityManager entityManager) {
        this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
    }

    @Override
    public Optional<ProcessoDistribuicao> findById(UUID id) {
        return Optional.ofNullable(entityManager.find(ProcessoDistribuicao.class, id));
    }

    @Override
    @Transactional
    public ProcessoDistribuicao save(ProcessoDistribuicao processo) {
        return entityManager.merge(processo);
    }

    @Override
    public boolean existsByRubricaSiglaAndPeriodoAndStatusNot(
            String rubricaSigla,
            String periodo,
            StatusProcesso status) {
        Long count = entityManager.createQuery("""
                        select count(processo)
                        from ProcessoDistribuicao processo
                        where processo.rubricaSigla = :rubricaSigla
                          and processo.periodo = :periodo
                          and processo.status <> :status
                        """, Long.class)
                .setParameter("rubricaSigla", rubricaSigla)
                .setParameter("periodo", periodo)
                .setParameter("status", status)
                .getSingleResult();
        return count > 0;
    }
}
