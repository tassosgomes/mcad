package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpringDataProcessoRepository
        extends JpaRepository<ProcessoDistribuicao, UUID>,
                JpaSpecificationExecutor<ProcessoDistribuicao> {

    boolean existsByRubricaSiglaAndPeriodoAndStatusNot(
            String rubricaSigla, String periodo, StatusProcesso status);

    @Query("""
            select p from ProcessoDistribuicao p
            where p.rubricaSigla = :rubricaSigla
              and p.periodo = :periodo
              and p.status <> :status
            """)
    Page<ProcessoDistribuicao> findByRubricaSiglaAndPeriodoAndStatusNot(
            @Param("rubricaSigla") String rubricaSigla,
            @Param("periodo") String periodo,
            @Param("status") StatusProcesso status,
            Pageable pageable);

    @Query("""
            SELECT p FROM ProcessoDistribuicao p
            WHERE p.rubricaSigla = :rubricaSigla
              AND p.periodo = :periodo
              AND p.status <> br.com.ecad.distribuicao.domain.enums.StatusProcesso.CANCELADO
            """)
    Optional<ProcessoDistribuicao> findAtivoByRubricaSiglaAndPeriodo(
            @Param("rubricaSigla") String rubricaSigla,
            @Param("periodo") String periodo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProcessoDistribuicao p WHERE p.id = :id")
    Optional<ProcessoDistribuicao> findByIdForUpdate(@Param("id") UUID id);
}
