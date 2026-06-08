package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import br.com.ecad.distribuicao.domain.filters.AjusteEstornoFiltro;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AjusteEstornoRepository {

    Optional<AjusteEstorno> findById(UUID id);

    Optional<AjusteEstorno> findByEventId(UUID eventId);

    Optional<AjusteEstorno> findByPagamentoId(UUID pagamentoId);

    AjusteEstorno save(AjusteEstorno ajuste);

    AjusteEstornoPage findAll(AjusteEstornoFiltro filtro, int page, int size);

    /**
     * Retorna ajustes no status {@code PENDENTE_APLICACAO} elegíveis para inclusão no
     * cálculo de um processo da rubrica e período informados, com bloqueio pessimista
     * (FOR UPDATE) para evitar concorrência.
     */
    List<AjusteEstorno> findPendentesElegiveisForUpdate(String rubricaSigla, String periodoAplicacao);

    List<AjusteEstorno> findPrevistosByProcessoAplicacaoId(UUID processoId);

    List<AjusteEstorno> findByProcessoAplicacaoIdAndStatusIn(UUID processoId, Collection<StatusAjusteEstorno> statuses);

    /**
     * Retorna {@code true} se existir ao menos um ajuste no status
     * {@code PROCESSO_CRIADO_DESATUALIZADO} referenciando o processo informado,
     * indicando que o snapshot do processo está desatualizado em relação a um estorno.
     */
    boolean existsBloqueioSnapshotDesatualizado(UUID processoId);
}
