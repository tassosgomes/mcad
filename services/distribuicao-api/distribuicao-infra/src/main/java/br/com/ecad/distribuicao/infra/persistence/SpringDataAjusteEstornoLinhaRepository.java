package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.AjusteEstornoLinha;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpringDataAjusteEstornoLinhaRepository
        extends JpaRepository<AjusteEstornoLinha, UUID> {

    List<AjusteEstornoLinha> findByAjusteId(UUID ajusteId);

    List<AjusteEstornoLinha> findByProcessoAplicacaoId(UUID processoAplicacaoId);

    @Modifying
    @Query("""
            DELETE FROM AjusteEstornoLinha l
            WHERE l.ajusteId = :ajusteId
              AND l.processoAplicacaoId = :processoAplicacaoId
            """)
    void deleteByAjusteIdAndProcessoAplicacaoId(
            @Param("ajusteId") UUID ajusteId,
            @Param("processoAplicacaoId") UUID processoAplicacaoId);
}
