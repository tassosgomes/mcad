package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.AjusteEstornoHistorico;
import java.util.List;
import java.util.UUID;

public interface AjusteEstornoHistoricoRepository {

    AjusteEstornoHistorico save(AjusteEstornoHistorico historico);

    List<AjusteEstornoHistorico> findByAjusteId(UUID ajusteId);
}
