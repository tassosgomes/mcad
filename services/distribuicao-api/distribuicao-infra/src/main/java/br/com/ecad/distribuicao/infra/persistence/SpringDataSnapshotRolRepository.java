package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpringDataSnapshotRolRepository extends JpaRepository<SnapshotRol, UUID> {

    @Query("""
            select s from SnapshotRol s
            where s.rubricaSigla = :rubricaSigla
              and s.periodo = :periodo
              and s.cancelado = false
            order by s.recebidoEm desc
            """)
    Optional<SnapshotRol> findAtivoPorRubricaAndPeriodo(
            @Param("rubricaSigla") String rubricaSigla,
            @Param("periodo") String periodo);

    @Query("""
            select s from SnapshotRol s
            where s.rubricaSigla = :rubricaSigla
              and s.periodo = :periodo
            order by s.recebidoEm desc
            """)
    Optional<SnapshotRol> findFirstByRubricaSiglaAndPeriodoOrderByRecebidoEmDesc(
            @Param("rubricaSigla") String rubricaSigla,
            @Param("periodo") String periodo);
}
