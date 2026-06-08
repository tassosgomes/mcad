package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.Credito;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpringDataCreditoRepository extends JpaRepository<Credito, UUID> {

    @Query("""
            SELECT c FROM Credito c
            WHERE c.processoId = :processoId
              AND c.status IN ('CALCULADO', 'RETIDO', 'LIBERADO')
              AND c.valorCredito > 0
            ORDER BY c.criadoEm ASC, c.id ASC
            """)
    List<Credito> findByProcessoIdForAjuste(@Param("processoId") UUID processoId);
}
