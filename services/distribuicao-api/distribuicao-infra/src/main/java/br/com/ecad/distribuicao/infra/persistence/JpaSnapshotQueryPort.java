package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotListPort;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class JpaSnapshotQueryPort implements SnapshotListPort {

    private final SpringDataSnapshotRolRepository rolRepository;
    private final SpringDataSnapshotVerbaRepository verbaRepository;

    public JpaSnapshotQueryPort(
            SpringDataSnapshotRolRepository rolRepository,
            SpringDataSnapshotVerbaRepository verbaRepository) {
        this.rolRepository = rolRepository;
        this.verbaRepository = verbaRepository;
    }

    @Override
    public List<SnapshotRol> findAllRolAtivos() {
        return rolRepository.findAll().stream()
                .filter(r -> !r.isCancelado())
                .toList();
    }

    @Override
    public List<SnapshotVerba> findAllVerbas() {
        return verbaRepository.findAll();
    }
}
