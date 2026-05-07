package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.Rubrica;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaRubricaRepository implements RubricaRepository {

    private final EntityManager entityManager;

    public JpaRubricaRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public List<Rubrica> findAll() {
        return entityManager
                .createQuery("select rubrica from Rubrica rubrica order by rubrica.sigla", Rubrica.class)
                .getResultList();
    }

    @Override
    public Optional<Rubrica> findBySigla(String sigla) {
        return entityManager
                .createQuery("select rubrica from Rubrica rubrica where rubrica.sigla = :sigla", Rubrica.class)
                .setParameter("sigla", sigla)
                .getResultStream()
                .findFirst();
    }

    @Override
    @Transactional
    public Rubrica upsertBySigla(Rubrica rubrica) {
        return entityManager.merge(rubrica);
    }
}
