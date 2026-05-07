package br.com.ecad.distribuicao.infra.persistence;

import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class JpaCreditoRepository implements CreditoRepository {

    private final EntityManager entityManager;

    public JpaCreditoRepository(EntityManager entityManager) {
        this.entityManager = Objects.requireNonNull(entityManager);
    }

    @Override
    @Transactional
    public void deleteByProcessoId(UUID processoId) {
        entityManager
                .createQuery("delete from Credito credito where credito.processoId = :processoId")
                .setParameter("processoId", processoId)
                .executeUpdate();
    }

    @Override
    @Transactional
    public List<Credito> saveAll(List<Credito> creditos) {
        Objects.requireNonNull(creditos, "creditos must not be null")
                .forEach(entityManager::persist);
        return List.copyOf(creditos);
    }

    @Override
    public Page<Credito> findByProcessoId(CreditoFiltro filtro, Pageable pageable) {
        Objects.requireNonNull(filtro, "filtro must not be null");
        Objects.requireNonNull(pageable, "pageable must not be null");

        String whereClause = """
                where credito.processoId = :processoId
                  and (:categoria is null or credito.categoria = :categoria)
                  and (:titularId is null or credito.titularId = :titularId)
                  and (:obraId is null or credito.obraId = :obraId)
                """;

        TypedQuery<Credito> query = entityManager.createQuery(
                "select credito from Credito credito "
                        + whereClause
                        + " order by credito.criadoEm asc, credito.id asc",
                Credito.class);
        setFiltroParameters(query, filtro);
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        TypedQuery<Long> countQuery = entityManager.createQuery(
                "select count(credito) from Credito credito " + whereClause,
                Long.class);
        setFiltroParameters(countQuery, filtro);

        return new PageImpl<>(query.getResultList(), pageable, countQuery.getSingleResult());
    }

    @Override
    public Optional<CalculoResumoProjection> buscarResumo(UUID processoId) {
        return entityManager
                .createQuery("""
                        select new br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection(
                            processo.id,
                            processo.status,
                            processo.rubricaSigla,
                            processo.periodo,
                            processo.verbaLiquida,
                            processo.totalExecucoes,
                            processo.totalObras,
                            processo.totalPontos,
                            processo.totalCreditos,
                            processo.valorTotalCalculado,
                            processo.calculadoEm
                        )
                        from ProcessoDistribuicao processo
                        where processo.id = :processoId
                        """, CalculoResumoProjection.class)
                .setParameter("processoId", processoId)
                .getResultStream()
                .findFirst();
    }

    private void setFiltroParameters(TypedQuery<?> query, CreditoFiltro filtro) {
        query.setParameter("processoId", filtro.processoId());
        query.setParameter("categoria", filtro.categoria());
        query.setParameter("titularId", filtro.titularId());
        query.setParameter("obraId", filtro.obraId());
    }
}
