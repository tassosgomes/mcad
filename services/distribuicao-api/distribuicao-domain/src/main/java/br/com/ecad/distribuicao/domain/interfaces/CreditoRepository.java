package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CreditoRepository {

    void deleteByProcessoId(UUID processoId);

    Optional<Credito> findById(UUID creditoId);

    Optional<Credito> findByIdForUpdate(UUID creditoId);

    List<Credito> saveAll(List<Credito> creditos);

    Page<Credito> findByProcessoId(CreditoFiltro filtro, Pageable pageable);

    Optional<CalculoResumoProjection> buscarResumo(UUID processoId);
}
