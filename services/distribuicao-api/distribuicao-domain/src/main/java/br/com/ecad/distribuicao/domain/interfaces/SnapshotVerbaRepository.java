package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import java.util.Optional;
import java.util.UUID;

public interface SnapshotVerbaRepository {
    Optional<SnapshotVerba> findById(UUID id);
    Optional<SnapshotVerba> findByRubricaSiglaAndPeriodo(String rubricaSigla, String periodo);
    SnapshotVerba save(SnapshotVerba snapshotVerba);
}
