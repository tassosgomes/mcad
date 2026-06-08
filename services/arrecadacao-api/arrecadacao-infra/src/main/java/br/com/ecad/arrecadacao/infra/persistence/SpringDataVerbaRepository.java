package br.com.ecad.arrecadacao.infra.persistence;

import br.com.ecad.arrecadacao.domain.entities.Verba;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório Spring Data JPA para o agregado Verba.
 *
 * <p>Expõe CRUD padrão via {@code JpaRepository} e filtros dinâmicos via
 * {@code JpaSpecificationExecutor}. O método {@code findByRubricaIdAndPeriodoForUpdate}
 * usa {@code SELECT FOR UPDATE} com timeout de 3 segundos para serializar
 * recálculos concorrentes na mesma chave {@code (rubrica_id, periodo)} (RF-11).</p>
 */
public interface SpringDataVerbaRepository
        extends JpaRepository<Verba, UUID>, JpaSpecificationExecutor<Verba> {

    /**
     * Busca a verba com lock pessimista (FOR UPDATE) para serializar recálculos concorrentes.
     * Timeout de 3000ms para evitar deadlocks prolongados.
     *
     * @param rubricaId ID da rubrica
     * @param periodo   período no formato YYYY-MM
     * @return Optional com a verba encontrada, ou vazio
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT v FROM Verba v WHERE v.rubricaId = :rubricaId AND v.periodo = :periodo")
    Optional<Verba> findByRubricaIdAndPeriodoForUpdate(
            @Param("rubricaId") UUID rubricaId,
            @Param("periodo") String periodo);

    /**
     * Busca a verba sem lock para consultas read-only.
     *
     * @param rubricaId ID da rubrica
     * @param periodo   período no formato YYYY-MM
     * @return Optional com a verba encontrada, ou vazio
     */
    Optional<Verba> findByRubricaIdAndPeriodo(UUID rubricaId, String periodo);

    /**
     * Retorna totais agregados por rubrica, com filtros opcionais de rubricaSigla e período.
     *
     * <p>Agrupa por {@code (rubricaId, rubricaSigla, rubricaNome)}, somando
     * {@code valorBrutoTotal} e {@code verbaLiquida} e contando períodos distintos.
     * Ordena por {@code rubricaSigla ASC} (RF-18).</p>
     *
     * @param rubricaSigla  sigla da rubrica para filtrar (null = sem filtro)
     * @param periodoInicio início do intervalo de período inclusive (null = sem filtro)
     * @param periodoFim    fim do intervalo de período inclusive (null = sem filtro)
     * @return lista de projeções agregadas ordenadas por rubricaSigla
     */
    @Query("""
            SELECT new br.com.ecad.arrecadacao.infra.persistence.VerbaAgregadoResult(
                v.rubricaId,
                r.sigla,
                r.nome,
                r.ativo,
                COALESCE(SUM(v.valorBrutoTotal), 0),
                COALESCE(SUM(v.verbaLiquida), 0),
                COUNT(DISTINCT v.periodo)
            )
            FROM Verba v
            JOIN v.rubrica r
            WHERE (:rubricaSigla IS NULL OR r.sigla = :rubricaSigla)
              AND (:periodoInicio IS NULL OR v.periodo >= :periodoInicio)
              AND (:periodoFim    IS NULL OR v.periodo <= :periodoFim)
            GROUP BY v.rubricaId, r.sigla, r.nome, r.ativo
            ORDER BY r.sigla ASC
            """)
    List<VerbaAgregadoResult> findAgregadoPorRubrica(
            @Param("rubricaSigla")  String rubricaSigla,
            @Param("periodoInicio") String periodoInicio,
            @Param("periodoFim")    String periodoFim);
}
