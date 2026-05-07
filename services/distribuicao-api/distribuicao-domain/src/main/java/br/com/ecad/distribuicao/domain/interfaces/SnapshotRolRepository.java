package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import java.util.Optional;
import java.util.UUID;

public interface SnapshotRolRepository {
    Optional<SnapshotRol> findByRubricaSiglaAndPeriodo(String rubricaSigla, String periodo);
    SnapshotRol save(SnapshotRol snapshotRol);
}
