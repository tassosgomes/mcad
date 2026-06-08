package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.AjusteEstornoHistorico;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataAjusteEstornoHistoricoRepository
        extends JpaRepository<AjusteEstornoHistorico, UUID> {

    List<AjusteEstornoHistorico> findByAjusteIdOrderByOcorridoEmAsc(UUID ajusteId);
}
