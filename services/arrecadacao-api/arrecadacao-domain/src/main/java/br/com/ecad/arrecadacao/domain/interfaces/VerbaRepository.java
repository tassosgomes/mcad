package br.com.ecad.arrecadacao.domain.interfaces;

import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoFiltro;
import br.com.ecad.arrecadacao.domain.projections.VerbaAgregadoProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Contrato de persistência do agregado Verba (F05).
 * Implementação JPA em arrecadacao-infra (task 2.0).
 */
public interface VerbaRepository {

    /**
     * Persiste ou atualiza a verba.
     */
    Verba save(Verba verba);

    /**
     * Busca a verba da rubrica+período com lock pessimista FOR UPDATE.
     * Usado por VerbaServiceImpl para serializar recálculos concorrentes.
     */
    Optional<Verba> findByRubricaIdAndPeriodoForUpdate(UUID rubricaId, String periodo);

    /**
     * Busca a verba da rubrica+período sem lock (leitura simples).
     */
    Optional<Verba> findByRubricaIdAndPeriodo(UUID rubricaId, String periodo);

    /**
     * Listagem paginada com filtros dinâmicos (RF-17, RF-19).
     */
    Page<Verba> findAll(Specification<Verba> spec, Pageable pageable);

    /**
     * Retorna totais agregados por rubrica para a visão consolidada (RF-18).
     *
     * @param filtro filtros opcionais de rubrica e período
     * @return lista de projeções agregadas, ordenadas por rubricaSigla ASC
     */
    List<VerbaAgregadoProjection> findAgregadoPorRubrica(VerbaAgregadoFiltro filtro);
}
