package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpringDataSnapshotVerbaRepository extends JpaRepository<SnapshotVerba, UUID> {

    @Query("""
            select s from SnapshotVerba s
            where s.rubricaSigla = :rubricaSigla
              and s.periodo = :periodo
            order by s.recebidoEm desc
            """)
    Optional<SnapshotVerba> findFirstByRubricaSiglaAndPeriodoOrderByRecebidoEmDesc(
            @Param("rubricaSigla") String rubricaSigla,
            @Param("periodo") String periodo);
}
