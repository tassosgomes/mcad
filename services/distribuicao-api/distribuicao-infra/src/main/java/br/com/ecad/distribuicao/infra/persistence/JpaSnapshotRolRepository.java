package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import jakarta.persistence.EntityManager;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaSnapshotRolRepository implements SnapshotRolRepository {

    private final EntityManager entityManager;

    public JpaSnapshotRolRepository(EntityManager entityManager) {
        this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
    }

    @Override
    public Optional<SnapshotRol> findById(UUID id) {
        return Optional.ofNullable(entityManager.find(SnapshotRol.class, id));
    }

    @Override
    public Optional<SnapshotRol> findByRubricaSiglaAndPeriodo(String rubricaSigla, String periodo) {
        return entityManager.createQuery("""
                        select snapshot
                        from SnapshotRol snapshot
                        where snapshot.rubricaSigla = :rubricaSigla
                          and snapshot.periodo = :periodo
                          and snapshot.cancelado = false
                        order by snapshot.recebidoEm desc
                        """, SnapshotRol.class)
                .setParameter("rubricaSigla", rubricaSigla)
                .setParameter("periodo", periodo)
                .setMaxResults(1)
                .getResultStream()
                .findFirst();
    }

    @Override
    @Transactional
    public SnapshotRol save(SnapshotRol snapshotRol) {
        return entityManager.merge(snapshotRol);
    }
}
