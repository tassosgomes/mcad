package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpringDataAjusteEstornoRepository
        extends JpaRepository<AjusteEstorno, UUID>,
                JpaSpecificationExecutor<AjusteEstorno> {

    Optional<AjusteEstorno> findByEventId(UUID eventId);

    Optional<AjusteEstorno> findByPagamentoId(UUID pagamentoId);

    List<AjusteEstorno> findByProcessoAplicacaoIdAndStatus(
            UUID processoAplicacaoId, StatusAjusteEstorno status);

    List<AjusteEstorno> findByProcessoAplicacaoIdAndStatusIn(
            UUID processoAplicacaoId, Collection<StatusAjusteEstorno> statuses);

    @Query("""
            SELECT COUNT(a) > 0 FROM AjusteEstorno a
            WHERE a.processoOrigemId = :processoId
              AND a.status = br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno.PROCESSO_CRIADO_DESATUALIZADO
            """)
    boolean existsBloqueioSnapshotDesatualizado(@Param("processoId") UUID processoId);
}
