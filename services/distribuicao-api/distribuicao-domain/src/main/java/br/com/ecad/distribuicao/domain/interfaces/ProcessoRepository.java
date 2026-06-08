package br.com.ecad.distribuicao.domain.interfaces;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProcessoRepository {
    Optional<ProcessoDistribuicao> findById(UUID id);
    ProcessoDistribuicao save(ProcessoDistribuicao processo);
    boolean existsByRubricaSiglaAndPeriodoAndStatusNot(String rubricaSigla, String periodo, StatusProcesso status);

    /**
     * Busca paginada com filtros dinâmicos (rubrica, período, status CSV).
     * Retorna página com processos e total de elementos.
     */
    ProcessoPage findAll(String rubricaSigla, String periodo, String status, int page, int size);

    /**
     * Retorna todos os processos para cálculo de disponibilidade.
     * Usado pelo ListarDisponiveisQueryHandler para cruzar com snapshots.
     */
    List<ProcessoDistribuicao> findAtivos();

    /**
     * Retorna processo não cancelado da rubrica+período, se existir.
     * Respeita constraint de processo ativo único.
     */
    Optional<ProcessoDistribuicao> findAtivoByRubricaSiglaAndPeriodo(String rubricaSigla, String periodo);

    /**
     * Busca processo pelo ID com bloqueio pessimista (FOR UPDATE),
     * garantindo exclusão mútua em operações de ajuste de estorno.
     */
    Optional<ProcessoDistribuicao> findByIdForUpdate(UUID id);

    record ProcessoPage(List<ProcessoDistribuicao> content, long totalElements, int totalPages) {}
}
