package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import java.util.Optional;
import java.util.UUID;

public interface ProcessoRepository {
    Optional<ProcessoDistribuicao> findById(UUID id);
    ProcessoDistribuicao save(ProcessoDistribuicao processo);
    boolean existsByRubricaSiglaAndPeriodoAndStatusNot(String rubricaSigla, String periodo, StatusProcesso status);
}
