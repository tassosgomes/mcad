package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
@SuppressWarnings("null")
public class JpaSnapshotRolRepository implements SnapshotRolRepository {

    private final SpringDataSnapshotRolRepository springDataSnapshotRolRepository;

    public JpaSnapshotRolRepository(SpringDataSnapshotRolRepository springDataSnapshotRolRepository) {
        this.springDataSnapshotRolRepository =
                Objects.requireNonNull(springDataSnapshotRolRepository, "springDataSnapshotRolRepository must not be null");
    }

    @Override
    public Optional<SnapshotRol> findById(UUID id) {
        return springDataSnapshotRolRepository.findById(id);
    }

    @Override
    public Optional<SnapshotRol> findByRubricaSiglaAndPeriodo(String rubricaSigla, String periodo) {
        return springDataSnapshotRolRepository.findAtivoPorRubricaAndPeriodo(rubricaSigla, periodo);
    }

    @Override
    public SnapshotRol save(SnapshotRol snapshotRol) {
        return springDataSnapshotRolRepository.save(snapshotRol);
    }
}
