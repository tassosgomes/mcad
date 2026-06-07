package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import br.com.ecad.distribuicao.domain.projections.TitularDemonstrativoProjection;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
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

    /**
     * Retorna créditos válidos para alocação de ajuste de estorno:
     * status CALCULADO/RETIDO/LIBERADO, valorCredito > 0,
     * ordenados por criadoEm ASC, id ASC.
     */
    List<Credito> findByProcessoIdForAjuste(UUID processoId);

    List<TitularDemonstrativoProjection> findTitularesByProcessoId(
            UUID processoId, String titularNomeFiltro, Pageable pageable);

    long countTitularesByProcessoId(UUID processoId, String titularNomeFiltro);

    List<Credito> findByProcessoAndTitularAndStatus(
            UUID processoId, UUID titularId, StatusCredito status);

    List<Credito> findLiberadosByProcessoLiberacaoAndTitular(
            UUID processoLiberacaoId, UUID titularId);

    Map<UUID, BigDecimal> sumLiberadosByProcessoLiberacaoId(UUID processoLiberacaoId);
}
