package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import java.util.List;

/**
 * Porta de consulta para listagem de snapshots de Rol e Verba.
 * Implementada na camada infra e usada para calcular combinações disponíveis.
 */
public interface SnapshotListPort {

    /** Retorna todos os SnapshotRol não cancelados. */
    List<SnapshotRol> findAllRolAtivos();

    /** Retorna todos os SnapshotVerba disponíveis. */
    List<SnapshotVerba> findAllVerbas();
}
