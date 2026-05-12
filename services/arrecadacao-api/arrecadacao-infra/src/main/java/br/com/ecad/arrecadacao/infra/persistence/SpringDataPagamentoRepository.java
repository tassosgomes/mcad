package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.aggregates.PagamentoAgregado;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface SpringDataPagamentoRepository extends JpaRepository<Pagamento, UUID>,
        JpaSpecificationExecutor<Pagamento> {

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Pagamento p " +
           "WHERE p.licencaId = :licencaId AND p.periodo = :periodo AND p.status = 'CONFIRMADO'")
    boolean existsConfirmadoByLicencaIdAndPeriodo(@Param("licencaId") UUID licencaId,
                                                   @Param("periodo") String periodo);

    @Query("""
        SELECT new br.com.ecad.arrecadacao.domain.aggregates.PagamentoAgregado(
            COALESCE(SUM(p.valorBruto), 0),
            COUNT(p.id))
        FROM Pagamento p
        JOIN p.licenca l
        WHERE l.rubricaId = :rubricaId
          AND p.periodo   = :periodo
          AND p.status    = 'CONFIRMADO'
        """)
    PagamentoAgregado sumAndCountConfirmados(@Param("rubricaId") UUID rubricaId,
                                             @Param("periodo") String periodo);
}
