package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotVerbaRepository;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
@SuppressWarnings("null")
public class JpaSnapshotVerbaRepository implements SnapshotVerbaRepository {

    private final SpringDataSnapshotVerbaRepository springDataSnapshotVerbaRepository;

    public JpaSnapshotVerbaRepository(SpringDataSnapshotVerbaRepository springDataSnapshotVerbaRepository) {
        this.springDataSnapshotVerbaRepository =
                Objects.requireNonNull(springDataSnapshotVerbaRepository, "springDataSnapshotVerbaRepository must not be null");
    }

    @Override
    public Optional<SnapshotVerba> findById(UUID id) {
        return springDataSnapshotVerbaRepository.findById(id);
    }

    @Override
    public Optional<SnapshotVerba> findByRubricaSiglaAndPeriodo(String rubricaSigla, String periodo) {
        return springDataSnapshotVerbaRepository
                .findFirstByRubricaSiglaAndPeriodoOrderByRecebidoEmDesc(rubricaSigla, periodo);
    }

    @Override
    public SnapshotVerba save(SnapshotVerba snapshotVerba) {
        return springDataSnapshotVerbaRepository.save(snapshotVerba);
    }
}
