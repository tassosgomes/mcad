package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotVerbaRepository;
import jakarta.persistence.EntityManager;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaSnapshotVerbaRepository implements SnapshotVerbaRepository {

    private final EntityManager entityManager;

    public JpaSnapshotVerbaRepository(EntityManager entityManager) {
        this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
    }

    @Override
    public Optional<SnapshotVerba> findById(UUID id) {
        return Optional.ofNullable(entityManager.find(SnapshotVerba.class, id));
    }

    @Override
    public Optional<SnapshotVerba> findByRubricaSiglaAndPeriodo(String rubricaSigla, String periodo) {
        return entityManager.createQuery("""
                        select snapshot
                        from SnapshotVerba snapshot
                        where snapshot.rubricaSigla = :rubricaSigla
                          and snapshot.periodo = :periodo
                        order by snapshot.recebidoEm desc
                        """, SnapshotVerba.class)
                .setParameter("rubricaSigla", rubricaSigla)
                .setParameter("periodo", periodo)
                .setMaxResults(1)
                .getResultStream()
                .findFirst();
    }

    @Override
    @Transactional
    public SnapshotVerba save(SnapshotVerba snapshotVerba) {
        return entityManager.merge(snapshotVerba);
    }
}
