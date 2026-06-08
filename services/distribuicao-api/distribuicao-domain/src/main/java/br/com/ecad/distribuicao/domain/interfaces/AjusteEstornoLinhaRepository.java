package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.AjusteEstornoLinha;
import java.util.List;
import java.util.UUID;

public interface AjusteEstornoLinhaRepository {

    List<AjusteEstornoLinha> saveAll(List<AjusteEstornoLinha> linhas);

    List<AjusteEstornoLinha> findByAjusteId(UUID ajusteId);

    List<AjusteEstornoLinha> findByProcessoAplicacaoId(UUID processoId);

    void deleteByAjusteIdAndProcessoAplicacaoId(UUID ajusteId, UUID processoAplicacaoId);
}
